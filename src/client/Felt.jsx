// ── Planning Poker · the felt table ───────────────────────────────────
// Seated voters (cards face-down until reveal), then a center control that
// moves from "waiting" → "reveal" → "results + revote".
import React from "react";
import { NS } from "./ds";
import { roundStats, display } from "../shared/poker";
import { usePoker } from "./usePokerRoom";

export function FeltTable() {
  const { PlayingCard, Avatar, Button } = NS;
  const { roster, round, voterIds, allVoted, votedCount, reveal, revote, me } = usePoker();

  const stats = roundStats(round.votes, voterIds);

  return (
    <div style={{ flex: 1, minHeight: 0, background: "var(--bg-felt)", position: "relative", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: 24, gap: 30, overflowY: "auto" }}>
      {/* prompt */}
      <div style={{ position: "absolute", top: 18, left: 0, right: 0, display: "flex", justifyContent: "center" }}>
        <span style={{ fontFamily: "var(--font-mono)", fontSize: 12, color: "rgba(234,242,238,0.55)" }}>
          {round.revealed ? "cards revealed · discuss the spread" : "everyone picks in private · flip at once"}
        </span>
      </div>

      {/* seated voters */}
      <div style={{ display: "flex", gap: 22, flexWrap: "wrap", justifyContent: "center", maxWidth: 760 }}>
        {roster.length === 0 ? (
          <span style={{ fontSize: 14, color: "rgba(234,242,238,0.6)" }}>Waiting for people to join…</span>
        ) : null}
        {roster.map((p) => {
          const v = round.votes[p.id];
          const voted = v != null;
          const isMe = me && p.id === me.id;
          return (
            <div key={p.id} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 8 }}>
              {p.isSpectator ? (
                <div style={{ width: 56, height: 84, borderRadius: "var(--radius-xl)", display: "grid", placeItems: "center", color: "rgba(234,242,238,0.4)" }}>
                  <i data-lucide="eye" style={{ width: 20, height: 20 }} />
                </div>
              ) : voted ? (
                <PlayingCard value={v} size="sm" faceDown={!round.revealed} />
              ) : (
                <div style={{ width: 56, height: 84, borderRadius: "var(--radius-xl)", border: "2px dashed rgba(255,255,255,0.22)" }} />
              )}
              <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <Avatar name={p.name} size="sm" presence={p.isSpectator ? "away" : voted ? "voted" : "thinking"} />
                <span style={{ fontSize: 13, color: "var(--text-on-felt)", fontWeight: isMe ? 700 : 500 }}>
                  {isMe ? "You" : p.name.split(" ")[0]}
                </span>
              </div>
            </div>
          );
        })}
      </div>

      {/* center control */}
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 14, width: "100%" }}>
        {!round.revealed ? (
          <>
            <span style={{ fontSize: 13.5, color: "rgba(234,242,238,0.72)" }}>
              {allVoted ? "Everyone has voted." : `${votedCount} of ${voterIds.length} have voted…`}
            </span>
            <Button variant="accent" size="lg" disabled={!allVoted} icon={<i data-lucide="eye" style={{ width: 18, height: 18 }} />} onClick={reveal}>
              Reveal cards
            </Button>
            {!allVoted && votedCount >= 1 ? (
              <button type="button" onClick={reveal} style={{ all: "unset", cursor: "pointer", fontSize: 12.5, color: "rgba(234,242,238,0.55)", textDecoration: "underline", textUnderlineOffset: 3 }}>
                Reveal now anyway
              </button>
            ) : null}
          </>
        ) : (
          <ResultsPanel stats={stats} revote={revote} />
        )}
      </div>
    </div>
  );
}

// ── Results (shown after reveal) ─────────────────────────────────────────
function ResultsPanel({ stats, revote }) {
  const { Badge, Button } = NS;
  const maxCount = Math.max(1, ...Object.values(stats.counts));

  return (
    <div style={{ width: "min(560px, 92%)", background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: "var(--radius-lg)", padding: 20, display: "flex", flexDirection: "column", gap: 16 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
        {stats.count === 0
          ? <Badge tone="neutral" solid>No votes</Badge>
          : stats.consensus
            ? <Badge tone="accent" solid dot>Consensus · {display(stats.mode)}</Badge>
            : <Badge tone="brand" solid>Discuss the spread</Badge>}
        {stats.avg != null ? <span style={{ fontFamily: "var(--font-mono)", fontSize: 12.5, color: "rgba(234,242,238,0.7)" }}>avg {stats.avg.toFixed(1)} · range {display(String(stats.lo))}–{display(String(stats.hi))}</span> : null}
      </div>

      {/* distribution */}
      {stats.count > 0 ? (
        <div style={{ display: "flex", gap: 14, alignItems: "flex-end", justifyContent: "center", height: 70, flexWrap: "wrap" }}>
          {stats.sorted.map(([v, c]) => (
            <div key={v} style={{ flex: "0 0 auto", width: 46, display: "flex", flexDirection: "column", alignItems: "center", gap: 5 }}>
              <span style={{ fontFamily: "var(--font-mono)", fontSize: 11, color: "rgba(234,242,238,0.7)" }}>{c}</span>
              <div style={{ width: "100%", maxWidth: 34, height: (c / maxCount) * 42 + 4, borderRadius: 5, background: v === stats.mode ? "var(--accent)" : "var(--blue-400)" }} />
              <span style={{ fontFamily: "var(--font-mono)", fontSize: 12, fontWeight: 600, color: "var(--text-on-felt)" }}>{display(v)}</span>
            </div>
          ))}
        </div>
      ) : null}

      <div style={{ borderTop: "1px solid rgba(255,255,255,0.1)", paddingTop: 14, display: "flex", justifyContent: "center" }}>
        <Button variant="secondary" size="md" icon={<i data-lucide="rotate-ccw" style={{ width: 16, height: 16 }} />} onClick={revote}>
          New round
        </Button>
      </div>
    </div>
  );
}
