// ── Planning Poker · pure state reducer ───────────────────────────────
// reduce(state, action) -> state. No side effects, no Date.now(): every
// timestamp arrives inside the action, so the Durable Object stays a thin
// transport shell and this stays unit-testable.

import type { RoomState, Round } from "./poker";

export type Action =
  | { t: "castVote"; pid: string; value: string }
  | { t: "reveal" }
  | { t: "revote"; now: number }
  | { t: "dropParticipant"; pid: string };

const freshRound = (now: number): Round => ({ votes: {}, revealed: false, startTs: now });

export function reduce(state: RoomState, action: Action): RoomState {
  switch (action.t) {
    case "castVote": {
      if (state.round.revealed) return state;
      return {
        ...state,
        round: { ...state.round, votes: { ...state.round.votes, [action.pid]: action.value } },
      };
    }

    case "reveal":
      return state.round.revealed ? state : { ...state, round: { ...state.round, revealed: true } };

    case "revote":
      return { ...state, round: freshRound(action.now) };

    case "dropParticipant": {
      if (state.round.votes[action.pid] == null) return state;
      const votes = { ...state.round.votes };
      delete votes[action.pid];
      return { ...state, round: { ...state.round, votes } };
    }

    default: {
      const _exhaustive: never = action;
      return state;
    }
  }
}
