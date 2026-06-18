// ── Planning Poker · room shell (top bar + felt + hand) ───────────────
import React from "react";
import { NS } from "./ds";
import { display, fmtTime } from "../shared/poker";
import { usePoker, roomSlug } from "./usePokerRoom";
import { FeltTable } from "./Felt";

export function RoomScreen() {
  const { Avatar, Deck } = NS;
  const { roomName, deck, roster, round, me, voters, allVoted, castVote, reveal, revote } = usePoker();

  React.useEffect(() => { if (window.lucide) window.lucide.createIcons(); });

  // Keyboard: R reveals (or revotes after reveal).
  React.useEffect(() => {
    const onKey = (e) => {
      const t = e.target;
      if (t && (t.tagName === "INPUT" || t.tagName === "TEXTAREA" || t.isContentEditable)) return;
      if (e.key === "r" || e.key === "R") {
        e.preventDefault();
        if (round.revealed) revote(); else if (allVoted) reveal();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [round.revealed, allVoted, reveal, revote]);

  const spectating = me && me.isSpectator;
  const myVote = me ? round.votes[me.id] : null;

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%", minWidth: 0, fontFamily: "var(--font-body)", background: "var(--bg-app)" }}>
      {/* top bar */}
      <header style={{ display: "flex", alignItems: "center", gap: 14, rowGap: 8, flexWrap: "wrap", padding: "12px 22px", borderBottom: "1px solid var(--border-subtle)", background: "var(--white)" }}>
        <span style={{ width: 30, height: 30, borderRadius: 8, background: "var(--brand)", color: "#fff", display: "grid", placeItems: "center", fontFamily: "var(--font-display)", fontWeight: 700, fontSize: 14, flex: "none" }}>pp</span>
        <div style={{ display: "flex", flexDirection: "column", minWidth: 0 }}>
          <span style={{ fontFamily: "var(--font-display)", fontWeight: 600, fontSize: 15, color: "var(--text-strong)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{roomName}</span>
          <span style={{ fontFamily: "var(--font-mono)", fontSize: 11, color: "var(--text-faint)" }}>{voters.length} voters · {deck.label}</span>
        </div>
        <RoundTimer startTs={round.startTs} />
        <ConnStatus />
        <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 12 }}>
          <div style={{ display: "flex" }}>
            {roster.slice(0, 6).map((p, i) => (
              <span key={p.id} style={{ marginLeft: i ? -8 : 0 }} title={p.name}>
                <Avatar name={p.name} size="sm" presence={p.isSpectator ? "away" : round.votes[p.id] != null ? "voted" : "thinking"} />
              </span>
            ))}
            {roster.length > 6 ? <span style={{ marginLeft: -8, width: 26, height: 26, borderRadius: "50%", background: "var(--ink-100)", color: "var(--text-muted)", display: "grid", placeItems: "center", fontSize: 11, fontWeight: 600, border: "2px solid var(--white)" }}>+{roster.length - 6}</span> : null}
          </div>
          <InviteMenu />
          <RoomMenu />
        </div>
      </header>

      <FeltTable />

      {/* hand dock */}
      <div style={{ padding: "16px 24px 20px", background: "var(--white)", borderTop: "1px solid var(--border-subtle)" }}>
        <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", marginBottom: 12, gap: 12, flexWrap: "wrap" }}>
          <span style={{ fontSize: 12, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", color: "var(--text-faint)" }}>Your hand</span>
          {spectating ? null : myVote != null && !round.revealed ? (
            <span style={{ fontSize: 13, color: "var(--text-muted)" }}>You picked <b style={{ color: "var(--brand)" }}>{display(myVote)}</b> — change it any time before reveal.</span>
          ) : !round.revealed ? (
            <span style={{ fontSize: 13, color: "var(--text-faint)" }}>Pick a card to cast your vote.</span>
          ) : null}
        </div>
        {spectating ? (
          <div style={{ display: "flex", alignItems: "center", gap: 10, color: "var(--text-muted)", fontSize: 14, padding: "14px 0" }}>
            <i data-lucide="eye" style={{ width: 18, height: 18 }} /> You're spectating this round — you won't cast a vote.
          </div>
        ) : (
          <Deck deck={deck.values} value={myVote} onSelect={round.revealed ? undefined : castVote} size="sm" />
        )}
      </div>
    </div>
  );
}

// ── Connection status pill ─────────────────────────────────────────────
function ConnStatus() {
  const { status } = usePoker();
  if (status === "open") return null;
  const reconnecting = status === "reconnecting";
  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "5px 10px", borderRadius: "var(--radius-pill)", background: reconnecting ? "var(--danger-soft)" : "var(--surface-sunk)", border: "1px solid var(--border-subtle)", fontFamily: "var(--font-mono)", fontSize: 12.5, color: reconnecting ? "var(--red-600)" : "var(--text-muted)" }}>
      <i data-lucide={reconnecting ? "wifi-off" : "loader"} style={{ width: 13, height: 13 }} />
      {reconnecting ? "Reconnecting…" : "Connecting…"}
    </span>
  );
}

// ── Count-up round timer ───────────────────────────────────────────────
function RoundTimer({ startTs }) {
  const [now, setNow] = React.useState(() => Date.now());
  React.useEffect(() => { const t = setInterval(() => setNow(Date.now()), 1000); return () => clearInterval(t); }, []);
  const elapsed = startTs ? now - startTs : 0;
  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "5px 10px", borderRadius: "var(--radius-pill)", background: "var(--surface-sunk)", border: "1px solid var(--border-subtle)", fontFamily: "var(--font-mono)", fontSize: 12.5, color: "var(--text-muted)" }}>
      <i data-lucide="clock" style={{ width: 13, height: 13 }} />{fmtTime(elapsed)}
    </span>
  );
}

// ── Invite / roster popover ────────────────────────────────────────────
function InviteMenu() {
  const { Button } = NS;
  const { roomName, roster, me } = usePoker();
  const [open, setOpen] = React.useState(false);
  const [copied, setCopied] = React.useState(false);
  React.useEffect(() => { if (window.lucide) window.lucide.createIcons(); });

  const link = `${location.origin}/room/${roomSlug(roomName)}`;
  const copy = () => { if (navigator.clipboard) navigator.clipboard.writeText(link); setCopied(true); setTimeout(() => setCopied(false), 1600); };

  return (
    <div style={{ position: "relative" }}>
      <Button variant="secondary" size="sm" icon={<i data-lucide="user-plus" style={{ width: 15, height: 15 }} />} onClick={() => setOpen((o) => !o)}>Invite</Button>
      {open ? (
        <>
          <div onClick={() => setOpen(false)} style={{ position: "fixed", inset: 0, zIndex: 40 }} />
          <div style={{ position: "absolute", right: 0, top: "calc(100% + 8px)", width: 300, maxWidth: "calc(100vw - 32px)", zIndex: 50, background: "var(--white)", border: "1px solid var(--border-subtle)", borderRadius: "var(--radius-lg)", boxShadow: "var(--shadow-lg)", padding: 16, display: "flex", flexDirection: "column", gap: 14 }}>
            <div>
              <span style={{ fontSize: 12, fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", color: "var(--text-faint)" }}>Invite link</span>
              <div style={{ display: "flex", gap: 6, marginTop: 8 }}>
                <span style={{ flex: 1, minWidth: 0, fontFamily: "var(--font-mono)", fontSize: 11.5, color: "var(--text-muted)", background: "var(--surface-sunk)", border: "1px solid var(--border-subtle)", borderRadius: "var(--radius-sm)", padding: "8px 10px", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{link}</span>
                <Button variant={copied ? "primary" : "secondary"} size="sm" onClick={copy}>{copied ? "Copied" : "Copy"}</Button>
              </div>
              <span style={{ display: "block", marginTop: 8, fontSize: 12, color: "var(--text-faint)" }}>Share this link — anyone who opens it joins this room live.</span>
            </div>
            <div style={{ borderTop: "1px solid var(--border-subtle)", paddingTop: 12 }}>
              <span style={{ fontSize: 12, fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", color: "var(--text-faint)" }}>In the room</span>
              <div style={{ display: "flex", flexDirection: "column", gap: 4, maxHeight: 200, overflowY: "auto", marginTop: 8 }}>
                {roster.map((p) => (
                  <div key={p.id} style={{ display: "flex", alignItems: "center", gap: 8, padding: "4px 2px" }}>
                    <NS.Avatar name={p.name} size="sm" presence={p.isSpectator ? "away" : undefined} />
                    <span style={{ flex: 1, fontSize: 13, color: "var(--text-body)" }}>{me && p.id === me.id ? p.name + " (you)" : p.name}{p.isSpectator ? <span style={{ color: "var(--text-faint)" }}> · spectator</span> : null}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </>
      ) : null}
    </div>
  );
}

// ── Overflow menu (leave) ──────────────────────────────────────────────
function RoomMenu() {
  const { leave } = usePoker();
  const [open, setOpen] = React.useState(false);
  React.useEffect(() => { if (window.lucide) window.lucide.createIcons(); });

  return (
    <div style={{ position: "relative" }}>
      <button type="button" aria-label="Menu" onClick={() => setOpen((o) => !o)} style={{ all: "unset", cursor: "pointer", width: 34, height: 34, borderRadius: "var(--radius-sm)", display: "grid", placeItems: "center", color: "var(--text-muted)", border: "1px solid var(--border-default)" }}>
        <i data-lucide="more-horizontal" style={{ width: 18, height: 18 }} />
      </button>
      {open ? (
        <>
          <div onClick={() => setOpen(false)} style={{ position: "fixed", inset: 0, zIndex: 40 }} />
          <div style={{ position: "absolute", right: 0, top: "calc(100% + 8px)", width: 200, zIndex: 50, background: "var(--white)", border: "1px solid var(--border-subtle)", borderRadius: "var(--radius-lg)", boxShadow: "var(--shadow-lg)", padding: 6, display: "flex", flexDirection: "column", gap: 2 }}>
            <button type="button" onClick={() => { setOpen(false); leave(); }} style={{ all: "unset", cursor: "pointer", display: "flex", alignItems: "center", gap: 9, padding: "9px 12px", borderRadius: "var(--radius-sm)", fontSize: 13.5, color: "var(--text-body)" }}
              onMouseEnter={(e) => { e.currentTarget.style.background = "var(--surface-sunk)"; }}
              onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; }}>
              <i data-lucide="log-out" style={{ width: 15, height: 15 }} />Leave room
            </button>
          </div>
        </>
      ) : null}
    </div>
  );
}
