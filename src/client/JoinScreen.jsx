// ── Planning Poker · join / lobby screen ──────────────────────────────
import React from "react";
import { NS } from "./ds";
import { DECKS } from "../shared/poker";
import { usePoker, initialRoomFromUrl } from "./usePokerRoom";

export function JoinScreen() {
  const { Button, Input, PlayingCard } = NS;
  const { join, session } = usePoker();

  const [name, setName] = React.useState(() => (session && session.name) || (() => { try { return localStorage.getItem("pp.name") || ""; } catch { return ""; } })());
  const [room, setRoom] = React.useState(() => (session && session.room) || initialRoomFromUrl() || "Sprint 37 planning");
  const [deckKey, setDeckKey] = React.useState((session && session.deckKey) || "fibonacci");
  const [spectator, setSpectator] = React.useState((session && session.isSpectator) || false);

  React.useEffect(() => { if (window.lucide) window.lucide.createIcons(); });

  const submit = () => { if (name.trim()) join({ name: name.trim(), room: room.trim() || "Planning room", deckKey, isSpectator: spectator }); };

  const deckBtn = (key) => {
    const on = deckKey === key;
    return (
      <button key={key} type="button" onClick={() => setDeckKey(key)} style={{
        all: "unset", cursor: "pointer", textAlign: "center", flex: 1, padding: "10px 8px",
        borderRadius: "var(--radius-md)", fontFamily: "var(--font-body)", fontSize: 14, fontWeight: 600,
        color: on ? "var(--brand-press)" : "var(--text-muted)",
        background: on ? "var(--brand-soft)" : "var(--white)",
        border: "1px solid " + (on ? "var(--brand)" : "var(--border-default)"),
        boxShadow: on ? "var(--ring-brand)" : "none", transition: "all var(--dur-fast) var(--ease-out)",
      }}>{DECKS[key].label}</button>
    );
  };

  return (
    <div className="pp-join">
      {/* Left — form */}
      <div className="pp-join-form">
       <div className="pp-join-form-inner">
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 44 }}>
          <span style={{ width: 34, height: 34, borderRadius: 9, background: "var(--brand)", color: "#fff", display: "grid", placeItems: "center", fontFamily: "var(--font-display)", fontWeight: 700, fontSize: 16, letterSpacing: "-0.02em" }}>pp</span>
          <span style={{ fontFamily: "var(--font-display)", fontWeight: 700, fontSize: 18, color: "var(--text-strong)", letterSpacing: "-0.01em" }}>Planning Poker</span>
        </div>
        <h1 style={{ fontFamily: "var(--font-display)", fontWeight: 700, fontSize: "var(--text-2xl)", letterSpacing: "-0.02em", color: "var(--text-strong)", margin: "0 0 12px", lineHeight: 1.08 }}>
          Estimate together,<br />without the anchoring.
        </h1>
        <p style={{ fontSize: 16, lineHeight: 1.55, color: "var(--text-muted)", margin: "0 0 32px", maxWidth: 430 }}>
          Everyone picks a card in private. They flip at once. You talk about the gap — not the loudest number.
        </p>
        <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
          <Input label="Your name" placeholder="e.g. Priya" value={name} onChange={(e) => setName(e.target.value)}
                 onKeyDown={(e) => { if (e.key === "Enter") submit(); }} />
          <Input label="Room" value={room} onChange={(e) => setRoom(e.target.value)}
                 onKeyDown={(e) => { if (e.key === "Enter") submit(); }} />
          <div>
            <span style={{ display: "block", fontSize: 13, fontWeight: 600, color: "var(--text-body)", marginBottom: 8 }}>Estimation scale</span>
            <div style={{ display: "flex", gap: 8 }}>{["fibonacci", "tshirt", "pow2"].map(deckBtn)}</div>
          </div>
          <label style={{ display: "flex", alignItems: "center", gap: 10, cursor: "pointer", userSelect: "none" }}>
            <span style={{
              width: 38, height: 22, borderRadius: 999, flex: "none", position: "relative",
              background: spectator ? "var(--brand)" : "var(--border-strong)", transition: "background var(--dur-fast) var(--ease-out)",
            }}>
              <span style={{ position: "absolute", top: 2, left: spectator ? 18 : 2, width: 18, height: 18, borderRadius: "50%", background: "#fff", transition: "left var(--dur-fast) var(--ease-out)", boxShadow: "var(--shadow-xs)" }} />
            </span>
            <span style={{ fontSize: 14, color: "var(--text-body)" }}>Join as spectator <span style={{ color: "var(--text-faint)" }}>— watch, don't vote</span></span>
            <input type="checkbox" checked={spectator} onChange={(e) => setSpectator(e.target.checked)} style={{ display: "none" }} />
          </label>
          <Button variant="primary" size="lg" block disabled={!name.trim()} onClick={submit}>
            {session ? "Back to room" : "Join room"}
          </Button>
        </div>
       </div>
      </div>

      {/* Right — felt with a fanned hand */}
      <div className="pp-join-felt">
        <div style={{ display: "flex", transform: "rotate(-6deg)" }}>
          {["3", "5", "8", "13"].map((v, i) => (
            <div key={v} style={{ transform: `translateX(${i * -18}px) rotate(${(i - 1.5) * 7}deg) translateY(${Math.abs(i - 1.5) * 10}px)` }}>
              <PlayingCard value={v} selected={v === "8"} size="lg" />
            </div>
          ))}
        </div>
        <span style={{ position: "absolute", bottom: 28, fontFamily: "var(--font-mono)", fontSize: 12, color: "rgba(234,242,238,0.55)" }}>
          flip at once · discuss the spread
        </span>
      </div>
    </div>
  );
}
