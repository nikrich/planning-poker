// ── Planning Poker · Cloudflare Worker entry ──────────────────────────
// Serves the built SPA (via the assets binding / SPA fallback) and routes
// WebSocket upgrades for a room to that room's Durable Object instance.
import { PokerRoom } from "./PokerRoom";

export interface Env {
  POKER_ROOM: DurableObjectNamespace;
  ASSETS: Fetcher;
}

const ROOM_WS = /^\/api\/room\/([^/]+)\/ws$/;

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);
    const match = url.pathname.match(ROOM_WS);

    if (match) {
      if (request.headers.get("Upgrade") !== "websocket") {
        return new Response("Expected a WebSocket upgrade", { status: 426 });
      }
      const roomId = decodeURIComponent(match[1]).slice(0, 128);
      const id = env.POKER_ROOM.idFromName(roomId);
      return env.POKER_ROOM.get(id).fetch(request);
    }

    // Anything else under /api is unknown; static assets are served by the
    // platform (run_worker_first only routes /api/* here).
    return new Response("Not found", { status: 404 });
  },
};

export { PokerRoom };
