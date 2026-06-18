// ── Planning Poker · WebSocket wire protocol ──────────────────────────
import type { DeckKey, Participant, Round } from "./poker";

// Client → server. `hello` carries deck/roomName used only to initialize a
// brand-new room; the rest are intents applied by the reducer.
export type ClientMsg =
  | { t: "hello"; name: string; isSpectator: boolean; deckKey: DeckKey; roomName: string }
  | { t: "castVote"; value: string }
  | { t: "reveal" }
  | { t: "revote" };

// Server → client. A full snapshot after every mutation keeps clients
// race-free; `you` identifies the receiving socket's roster seat.
export interface StateMsg {
  type: "state";
  roomName: string;
  deckKey: DeckKey;
  roster: Participant[];
  round: Round;
  you: { id: string };
}

export type ServerMsg = StateMsg;
