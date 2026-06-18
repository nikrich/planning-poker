// ── Planning Poker · PokerRoom Durable Object ─────────────────────────
// One instance per room id. Holds the authoritative RoomState, applies
// client intents through the pure reducer, persists to DO storage, and
// rebroadcasts a full snapshot to every connected socket. Uses the
// hibernatable WebSocket API so idle rooms cost nothing.
import { reduce, type Action } from "../shared/reducer";
import { initialState, type DeckKey, type Participant, type RoomState } from "../shared/poker";
import type { ClientMsg, StateMsg } from "../shared/protocol";
import type { Env } from "./index";

interface Attachment {
  id: string;
  name: string;
  isSpectator: boolean;
}

export class PokerRoom implements DurableObject {
  private ctx: DurableObjectState;
  private state: RoomState | null = null;

  constructor(ctx: DurableObjectState, _env: Env) {
    this.ctx = ctx;
    this.ctx.blockConcurrencyWhile(async () => {
      this.state = (await this.ctx.storage.get<RoomState>("state")) ?? null;
    });
  }

  async fetch(request: Request): Promise<Response> {
    if (request.headers.get("Upgrade") !== "websocket") {
      return new Response("Expected a WebSocket upgrade", { status: 426 });
    }
    const pair = new WebSocketPair();
    const [client, server] = [pair[0], pair[1]];
    this.ctx.acceptWebSocket(server);
    return new Response(null, { status: 101, webSocket: client });
  }

  // ── Hibernation handlers ──
  async webSocketMessage(ws: WebSocket, raw: string | ArrayBuffer): Promise<void> {
    let msg: ClientMsg;
    try {
      msg = JSON.parse(typeof raw === "string" ? raw : new TextDecoder().decode(raw));
    } catch {
      return;
    }

    if (msg.t === "hello") {
      this.onHello(ws, msg);
      return;
    }

    const att = this.attachment(ws);
    if (!att || !this.state) return; // must hello first

    const action = this.toAction(msg, att);
    if (!action) return;
    this.state = reduce(this.state, action);
    await this.persist();
    this.broadcast();
  }

  async webSocketClose(ws: WebSocket): Promise<void> {
    this.onLeave(ws);
  }

  async webSocketError(ws: WebSocket): Promise<void> {
    this.onLeave(ws);
  }

  // ── helpers ──
  private attachment(ws: WebSocket): Attachment | null {
    return (ws.deserializeAttachment() as Attachment | null) ?? null;
  }

  private roster(): Participant[] {
    return this.ctx
      .getWebSockets()
      .map((ws) => this.attachment(ws))
      .filter((a): a is Attachment => a != null)
      .map((a) => ({ id: a.id, name: a.name, isSpectator: a.isSpectator }));
  }

  private onHello(ws: WebSocket, msg: Extract<ClientMsg, { t: "hello" }>): void {
    if (!this.state) {
      const deckKey: DeckKey = (["fibonacci", "tshirt", "pow2"] as DeckKey[]).includes(msg.deckKey)
        ? msg.deckKey
        : "fibonacci";
      this.state = initialState((msg.roomName || "Planning room").slice(0, 80), deckKey, Date.now());
      // Persist the seeded room; fire-and-forget is fine, snapshot follows.
      void this.persist();
    }
    const att: Attachment = {
      id: crypto.randomUUID(),
      name: (msg.name || "Guest").slice(0, 40),
      isSpectator: !!msg.isSpectator,
    };
    ws.serializeAttachment(att);
    this.broadcast();
  }

  private onLeave(ws: WebSocket): void {
    const att = this.attachment(ws);
    try {
      ws.close();
    } catch {
      /* already closing */
    }
    if (att && this.state) {
      // Drop that participant's vote, then let the rest of the room re-sync.
      this.state = reduce(this.state, { t: "dropParticipant", pid: att.id });
      void this.persist();
    }
    this.broadcast();
  }

  private toAction(msg: ClientMsg, att: Attachment): Action | null {
    const now = Date.now();
    switch (msg.t) {
      case "castVote":
        return att.isSpectator ? null : { t: "castVote", pid: att.id, value: msg.value };
      case "reveal":
        return { t: "reveal" };
      case "revote":
        return { t: "revote", now };
      default:
        return null;
    }
  }

  private async persist(): Promise<void> {
    if (this.state) await this.ctx.storage.put("state", this.state);
  }

  private broadcast(): void {
    if (!this.state) return;
    const roster = this.roster();
    const base = {
      type: "state" as const,
      roomName: this.state.roomName,
      deckKey: this.state.deckKey,
      roster,
      round: this.state.round,
    };
    for (const ws of this.ctx.getWebSockets()) {
      const att = this.attachment(ws);
      if (!att) continue; // hasn't said hello yet
      const payload: StateMsg = { ...base, you: { id: att.id } };
      try {
        ws.send(JSON.stringify(payload));
      } catch {
        /* socket gone; close handler will clean up */
      }
    }
  }
}
