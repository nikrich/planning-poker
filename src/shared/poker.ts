// ── Planning Poker · shared types + pure helpers ──────────────────────
// Used by both the client (rendering/stats) and the Durable Object. No DOM,
// no Date.now() — fully deterministic so the reducer that builds on this is
// unit-testable. (Backlog/stories deliberately omitted for now; story sync
// will come from Jira later.)

export type DeckKey = "fibonacci" | "tshirt" | "pow2";

export interface Deck {
  label: string;
  values: string[];
}

export interface Round {
  votes: Record<string, string>;
  revealed: boolean;
  startTs: number | null;
}

export interface RoomState {
  roomName: string;
  deckKey: DeckKey;
  round: Round;
}

export interface Participant {
  id: string;
  name: string;
  isSpectator: boolean;
}

// ── Decks ──────────────────────────────────────────────────────────────
export const DECKS: Record<DeckKey, Deck> = {
  fibonacci: { label: "Fibonacci", values: ["0", "1", "2", "3", "5", "8", "13", "21", "?", "coffee"] },
  tshirt: { label: "T-shirt", values: ["XS", "S", "M", "L", "XL", "?"] },
  pow2: { label: "Powers of 2", values: ["1", "2", "4", "8", "16", "32", "64", "?"] },
};
export const TSHIRT_NUM: Record<string, number> = { XS: 1, S: 2, M: 3, L: 5, XL: 8 };
export const SPECIAL = ["?", "coffee"];

export const isSpecial = (v: string | null | undefined): boolean =>
  v == null || SPECIAL.includes(v);
export const display = (v: string | null): string => (v === "coffee" ? "☕" : (v ?? ""));

export function deckOf(deckKey: DeckKey | string): Deck {
  return DECKS[deckKey as DeckKey] || DECKS.fibonacci;
}

export function numericValue(v: string | null | undefined): number | null {
  if (isSpecial(v)) return null;
  if (v != null && v in TSHIRT_NUM) return TSHIRT_NUM[v];
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

export function initialState(roomName: string, deckKey: DeckKey, now: number): RoomState {
  return { roomName, deckKey, round: { votes: {}, revealed: false, startTs: now } };
}

// ── Round statistics ───────────────────────────────────────────────────
export interface RoundStats {
  counts: Record<string, number>;
  sorted: [string, number][];
  avg: number | null;
  consensus: boolean;
  mode: string | null;
  lo: number | null;
  hi: number | null;
  count: number;
}

export function roundStats(votes: Record<string, string>, voterIds: string[]): RoundStats {
  const vals = voterIds.map((id) => votes[id]).filter((v) => v != null);
  const counts: Record<string, number> = {};
  vals.forEach((v) => {
    counts[v] = (counts[v] || 0) + 1;
  });
  const sorted = Object.entries(counts).sort(
    (a, b) => b[1] - a[1] || ((numericValue(a[0]) ?? 99) - (numericValue(b[0]) ?? 99)),
  );
  const nums = vals.map(numericValue).filter((x): x is number => x != null);
  const avg = nums.length ? nums.reduce((a, b) => a + b, 0) / nums.length : null;
  const consensus = sorted.length === 1 && vals.length > 1;
  const mode = sorted.length ? sorted[0][0] : null;
  const lo = nums.length ? Math.min(...nums) : null;
  const hi = nums.length ? Math.max(...nums) : null;
  return { counts, sorted, avg, consensus, mode, lo, hi, count: vals.length };
}

export function fmtTime(ms: number): string {
  const s = Math.max(0, Math.floor(ms / 1000));
  return String(Math.floor(s / 60)).padStart(2, "0") + ":" + String(s % 60).padStart(2, "0");
}
