import { describe, it, expect } from "vitest";
import { reduce, type Action } from "./reducer";
import { initialState, type RoomState } from "./poker";

function freshState(): RoomState {
  return {
    roomName: "Test room",
    deckKey: "fibonacci",
    round: { votes: {}, revealed: false, startTs: 0 },
  };
}

const apply = (s: RoomState, ...actions: Action[]) => actions.reduce((acc, a) => reduce(acc, a), s);

describe("castVote", () => {
  it("records a participant's vote", () => {
    const s = reduce(freshState(), { t: "castVote", pid: "p1", value: "5" });
    expect(s.round.votes).toEqual({ p1: "5" });
  });

  it("lets a participant change their vote before reveal", () => {
    const s = apply(freshState(), { t: "castVote", pid: "p1", value: "5" }, { t: "castVote", pid: "p1", value: "8" });
    expect(s.round.votes.p1).toBe("8");
  });

  it("ignores votes once revealed", () => {
    const s = apply(
      freshState(),
      { t: "castVote", pid: "p1", value: "5" },
      { t: "reveal" },
      { t: "castVote", pid: "p1", value: "13" },
    );
    expect(s.round.votes.p1).toBe("5");
  });
});

describe("reveal / revote", () => {
  it("reveal flips the round", () => {
    expect(reduce(freshState(), { t: "reveal" }).round.revealed).toBe(true);
  });

  it("revote clears votes, unreveals, and restamps startTs", () => {
    const s = apply(
      freshState(),
      { t: "castVote", pid: "p1", value: "5" },
      { t: "reveal" },
      { t: "revote", now: 999 },
    );
    expect(s.round).toEqual({ votes: {}, revealed: false, startTs: 999 });
  });
});

describe("dropParticipant", () => {
  it("removes that participant's vote only", () => {
    const s = apply(
      freshState(),
      { t: "castVote", pid: "p1", value: "5" },
      { t: "castVote", pid: "p2", value: "8" },
      { t: "dropParticipant", pid: "p1" },
    );
    expect(s.round.votes).toEqual({ p2: "8" });
  });

  it("is a no-op when the participant had no vote", () => {
    const before = apply(freshState(), { t: "castVote", pid: "p2", value: "8" });
    const after = reduce(before, { t: "dropParticipant", pid: "p1" });
    expect(after.round.votes).toEqual({ p2: "8" });
  });
});

describe("initialState", () => {
  it("seeds an empty round with the chosen deck", () => {
    const s = initialState("Sprint 1", "tshirt", 42);
    expect(s.deckKey).toBe("tshirt");
    expect(s.roomName).toBe("Sprint 1");
    expect(s.round).toEqual({ votes: {}, revealed: false, startTs: 42 });
  });
});
