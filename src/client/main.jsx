// ── Planning Poker · client entry ─────────────────────────────────────
import React from "react";
import { createRoot } from "react-dom/client";
import {
  createIcons,
  Eye, Clock, UserPlus, MoreHorizontal, LogOut, RotateCcw, WifiOff, Loader,
} from "lucide";
import "./styles.css";
import { PokerProvider, usePoker } from "./usePokerRoom";
import { JoinScreen } from "./JoinScreen";
import { RoomScreen } from "./Room";

// Only the icons actually used in the UI — keeps the bundle small. createIcons
// matches each <i data-lucide="kebab-name"> to its PascalCase key here.
const icons = { Eye, Clock, UserPlus, MoreHorizontal, LogOut, RotateCcw, WifiOff, Loader };

// The ported components call `window.lucide.createIcons()` in effects to swap
// <i data-lucide> placeholders for SVGs — keep that contract.
window.lucide = { createIcons: (opts) => createIcons({ icons, ...opts }) };

function Connecting() {
  React.useEffect(() => { if (window.lucide) window.lucide.createIcons(); });
  return (
    <div style={{ height: "100%", display: "grid", placeItems: "center", background: "var(--bg-felt)", color: "var(--text-on-felt)", fontFamily: "var(--font-body)" }}>
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 14 }}>
        <span style={{ width: 44, height: 44, borderRadius: 12, background: "var(--brand)", color: "#fff", display: "grid", placeItems: "center", fontFamily: "var(--font-display)", fontWeight: 700, fontSize: 20 }}>pp</span>
        <span style={{ fontSize: 14, color: "rgba(234,242,238,0.75)" }}>Joining the room…</span>
      </div>
    </div>
  );
}

function Root() {
  const { session, ready } = usePoker();
  React.useEffect(() => { if (window.lucide) window.lucide.createIcons(); });
  if (!session) return <JoinScreen />;
  return ready ? <RoomScreen /> : <Connecting />;
}

createRoot(document.getElementById("root")).render(
  <PokerProvider><Root /></PokerProvider>,
);
