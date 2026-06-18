# Planning Poker on Cloudflare — Design

**Date:** 2026-06-18
**Repo:** `nikrich/planning-poker` (public)
**Source:** Claude Design project `Planning Poker.html` (single-player simulation with bot voters + localStorage), turned into real-time multiplayer.

> **Scope update (2026-06-18):** the backlog/stories feature (sidebar, per-story
> history, CSV export, and the finalize/"save estimate & next" step) was
> **descoped** during implementation — story sync will come from Jira later.
> The shipped app is a single shared voting round: vote → reveal → discuss →
> revote. Accordingly the Durable Object state is `{ roomName, deckKey, round }`
> (no `board`), the protocol drops the story/finalize messages, and the room is a
> single-column responsive layout (no sidebar). The architecture, transport, and
> realtime model below are unchanged.

## Goal

A working multiplayer Planning Poker app deployed to Cloudflare. Teams join a room by link, vote on backlog stories in private, reveal simultaneously, discuss the spread, and finalize estimates — all synchronized in real time over WebSockets, with room state persisted server-side.

## Architecture

```
Browser (Vite-built React SPA)
   │  WebSocket  wss://<host>/api/room/:roomId/ws
   ▼
Cloudflare Worker (router + static asset serving via @cloudflare/vite-plugin)
   │  forwards WS upgrade, keyed by roomId
   ▼
Durable Object  "PokerRoom"  (one instance per roomId, SQLite-backed)
   • authoritative state: roomName, deckKey, board (backlog+history), round (votes, revealed, startTs)
   • roster = connected WebSockets (each carries {id,name,isSpectator} via serializeAttachment)
   • applies actions through a pure reducer, persists board/round to DO storage, rebroadcasts a full snapshot
```

- **Worker** (`src/worker/index.ts`): serves the built SPA (Cloudflare assets, SPA fallback) and routes `GET /api/room/:id/ws` (WebSocket upgrade) to `POKER_ROOM.idFromName(roomId)`. `run_worker_first: ["/api/*"]`.
- **PokerRoom DO** (`src/worker/PokerRoom.ts`): hibernatable WebSockets (`ctx.acceptWebSocket`). Thin transport shell around the pure reducer. Persists `board`/`round`/`roomName`/`deckKey` to `ctx.storage`. Server is authoritative — clients send intents, never state.
- **SQLite-backed DO** (`new_sqlite_classes`) so it runs on the Workers free plan.

## Protocol (JSON over WebSocket)

**Client → server:**
- `{t:"hello", name, isSpectator, deckKey, roomName}` — deckKey/roomName only used to initialize a brand-new room
- `{t:"castVote", value}` · `{t:"reveal"}` · `{t:"revote"}` · `{t:"finalize", est}`
- `{t:"addStory", title}` · `{t:"editStory", id, title}` · `{t:"deleteStory", id}` · `{t:"moveStory", id, dir}` · `{t:"setActiveStory", id}`
- `{t:"reset"}` — reinitialize the room's board/round (the design's "Reset session")

**Server → client:**
- `{type:"state", roomName, deckKey, roster:[{id,name,isSpectator}], board, round, you:{id}}` — full snapshot after every mutation. State is small; full-snapshot keeps it race-free.

Each socket is assigned a server-side participant `id` on `hello`. `you.id` tells the client which roster seat is theirs (replaces the original `'me'` magic id). Presence (`thinking`/`voted`/`away`) is derived from votes + spectator flag, exactly as the design renders it. A socket's vote is dropped from `round.votes` on disconnect.

## State shape

```ts
Story  = { id, title, status: 'pending'|'estimated', est: string|null }   // 'anchor' (bot-only) dropped
Board  = { stories: Story[], activeStoryId: string|null, history: Record<storyId, HistoryEntry[]> }
HistoryEntry = { ts, finalEst, votes: Record<pid,string> }
Round  = { votes: Record<pid,string>, revealed: boolean, startTs: number|null }
RoomState = { roomName, deckKey, board, round }   // roster is ephemeral (connected sockets), not persisted
```

## Pure reducer (`src/shared/reducer.ts`)

`reduce(state, action) -> state`. All mutations (castVote/reveal/revote/finalize/addStory/editStory/deleteStory/moveStory/setActiveStory/reset) are pure functions of prior state + action; timestamps are passed in the action (no `Date.now()` inside) so the reducer is deterministic and unit-tested with Vitest. `finalize` snapshots votes into `board.history[storyId]`, marks the story estimated, and advances `activeStoryId` to the next pending story — same semantics as the original `store.finalize`. The DO is a thin shell that assigns ids, stamps `now`, calls `reduce`, persists, and broadcasts.

## Frontend (preserve the design exactly)

- Vite + React + TypeScript; bundle React (no CDN, no in-browser Babel).
- **Design system ported to ES modules** (`src/client/ds/*`): Avatar, Badge, Button, Card, Input, PlayingCard, Deck — style objects copied verbatim from the design bundle. Tokens (`colors/fonts/typography/spacing/radius.css`) copied verbatim; fonts via Google Fonts `@import` (as in the source). Lucide via the `lucide` npm package, exposed as `window.lucide` so existing `data-lucide` + `createIcons()` calls work unchanged.
- **`store.jsx` → `usePokerRoom` hook + `PokerProvider`**: opens the WS, holds the latest server snapshot, and exposes the **same `value` object the components already consume** (`session, board, roster, round, activeStory, voters, voterIds, me, allVoted, votedCount, deck`, plus action fns) — but each action sends a WS message instead of mutating local state. Own vote is applied optimistically, then reconciled by the next snapshot.
- **Bots removed**: delete `BOT_POOL`/`pickBots`/`botTargetVote` and the bot-timer effect. `addTeammate`/`removeTeammate` gone; the Invite popover keeps copy-link + live roster (link = `/room/:roomId`, slug from room name). Seed backlog seeds a brand-new room only (server-side).
- **Room identity**: `roomId` slug in the URL (`/room/:id`). Join form sets name/spectator (and deck/roomName for a new room), then connects. Refresh reconnects and resumes from the DO (state lives server-side; only `name` cached locally for convenience).
- **Connection status**: a small pill in the top bar (connected / reconnecting). WS auto-reconnects with backoff; on reopen the DO re-sends a snapshot.

## Edge cases & errors

- Leaving / closing the tab removes the seat (`webSocketClose`) and drops its vote. An empty room keeps its backlog in storage so the invite link still works later; only explicit "Reset session" wipes board/round.
- `reveal` allowed once ≥1 vote exists (UI enables the button when everyone has voted, with a "reveal now anyway" affordance ≥1 vote — same as the design).
- Spectators never get a vote and render with the `eye` placeholder.

## Tooling & testing

- `@cloudflare/vite-plugin` for an integrated client+worker build with DO support; `npm run dev` (Vite+workerd), `npm run build`, `npm run deploy` (→ `wrangler deploy`).
- `wrangler.jsonc`: `POKER_ROOM` DO binding, `new_sqlite_classes` migration, SPA assets, `run_worker_first`.
- **Vitest** unit tests for the pure reducer (votes / reveal / revote / finalize-advances-story / backlog edits / reset). The reducer is the core logic and is tested without a live socket.
- Deployed live to the user's Cloudflare account; repo pushed to `nikrich/planning-poker`.
