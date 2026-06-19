# Planning Poker

Real-time, multiplayer [planning poker](https://en.wikipedia.org/wiki/Planning_poker) on Cloudflare. Everyone picks a card in private, the cards flip at once, and you discuss the spread instead of anchoring on the loudest number.

<img width="1595" height="830" alt="image" src="https://github.com/user-attachments/assets/c48caeec-5504-4938-b7a1-725e315c8233" />


## Stack

- **Frontend** — React 18 + Vite (TypeScript), the design system ported to ES modules, [lucide](https://lucide.dev) icons.
- **Backend** — a single Cloudflare **Worker** serves the SPA and routes WebSocket upgrades to a **Durable Object** (`PokerRoom`), one instance per room.
- **Realtime + storage** — the Durable Object holds the authoritative room state, broadcasts a full snapshot to every connected socket on each change, and persists to its own (SQLite-backed) transactional storage. That *is* the realtime database — no separate DB needed.

## How it works

```
Browser ──WebSocket──▶ Worker ──▶ PokerRoom Durable Object (idFromName(roomId))
                                   • roster = connected sockets
                                   • round  = { votes, revealed, startTs }
                                   • applies intents via a pure reducer, persists, rebroadcasts
```

- Clients send **intents** (`hello`, `castVote`, `reveal`, `revote`); the server is authoritative and pushes back `{type:"state", …}` snapshots. The only client-side optimism is your own vote.
- Room id is a slug of the room name; the invite link is `/room/<slug>`. Open it and you join that room live.
- Spectators watch without voting. A participant's vote is dropped when their socket disconnects. WebSockets auto-reconnect with backoff.

The voting **round** is the unit of work — there's intentionally no backlog/stories yet; story sync will come from Jira later.

## Develop

```bash
npm install
npm run dev        # Vite + workerd (Durable Objects) with HMR
npm test           # Vitest — pure reducer unit tests
npm run typecheck  # tsc for client + worker (separate configs)
```

## Deploy

```bash
npm run deploy     # vite build + wrangler deploy
```

Requires `wrangler login`. The Durable Object migration is declared in `wrangler.jsonc`.

## Layout

```
src/
  shared/      poker.ts (types + helpers) · reducer.ts (pure state machine) · protocol.ts (wire types)
  worker/      index.ts (router) · PokerRoom.ts (Durable Object)
  client/      main.jsx · usePokerRoom.jsx (WS store) · JoinScreen/Room/Felt · ds/ (design system) · tokens/
docs/superpowers/specs/   design doc
```
