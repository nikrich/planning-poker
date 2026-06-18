// ── Planning Poker · realtime room store ──────────────────────────────
// Replaces the original localStorage + bot-engine store. Opens a WebSocket
// to the room's Durable Object, holds the latest server snapshot, and
// exposes the SAME value shape the UI components consume — but every action
// sends an intent over the socket instead of mutating local state. The
// server is authoritative; the only local optimism is the player's own vote.
import React from "react";
import { DECKS } from "../shared/poker";

const PokerContext = React.createContext(null);

const EMPTY_ROUND = { votes: {}, revealed: false, startTs: null };

export function roomSlug(name) {
  return (name || "room").toLowerCase().trim().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "").slice(0, 80) || "room";
}

// A direct visit to /room/<slug> prefills the join form's room field.
export function initialRoomFromUrl() {
  const m = location.pathname.match(/^\/room\/([^/]+)/);
  if (!m) return null;
  const slug = decodeURIComponent(m[1]);
  return slug.replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

export function PokerProvider({ children }) {
  const [session, setSession] = React.useState(null);
  const [snapshot, setSnapshot] = React.useState(null);
  const [status, setStatus] = React.useState("idle"); // idle | connecting | open | reconnecting
  const [pendingVote, setPendingVote] = React.useState(null); // { value, ts } — optimistic own vote

  const wsRef = React.useRef(null);
  const sessionRef = React.useRef(null);
  const userClosedRef = React.useRef(false);
  const retryRef = React.useRef(0);

  const connect = React.useCallback(() => {
    const s = sessionRef.current;
    if (!s) return;
    setStatus(retryRef.current ? "reconnecting" : "connecting");
    const proto = location.protocol === "https:" ? "wss" : "ws";
    const ws = new WebSocket(`${proto}://${location.host}/api/room/${encodeURIComponent(roomSlug(s.room))}/ws`);
    wsRef.current = ws;

    ws.onopen = () => {
      retryRef.current = 0;
      setStatus("open");
      ws.send(JSON.stringify({ t: "hello", name: s.name, isSpectator: !!s.isSpectator, deckKey: s.deckKey, roomName: s.room }));
    };
    ws.onmessage = (e) => {
      let msg;
      try { msg = JSON.parse(e.data); } catch { return; }
      if (msg.type !== "state") return;
      setSnapshot(msg);
      setPendingVote((pv) => {
        if (!pv) return null;
        if (msg.round.revealed) return null;
        if (msg.round.startTs !== pv.ts) return null;          // round moved on
        if (msg.round.votes[msg.you.id] === pv.value) return null; // server confirmed it
        return pv;
      });
    };
    ws.onerror = () => { try { ws.close(); } catch { /* noop */ } };
    ws.onclose = () => {
      wsRef.current = null;
      if (userClosedRef.current || !sessionRef.current) { setStatus("idle"); return; }
      setStatus("reconnecting");
      const delay = Math.min(1000 * 2 ** retryRef.current, 8000);
      retryRef.current += 1;
      setTimeout(() => { if (!userClosedRef.current && sessionRef.current) connect(); }, delay);
    };
  }, []);

  React.useEffect(() => () => { userClosedRef.current = true; if (wsRef.current) try { wsRef.current.close(); } catch { /* noop */ } }, []);

  const send = (msg) => {
    const ws = wsRef.current;
    if (ws && ws.readyState === WebSocket.OPEN) ws.send(JSON.stringify(msg));
  };

  // ── Session lifecycle ──
  function join({ name, room, deckKey, isSpectator }) {
    userClosedRef.current = false;
    retryRef.current = 0;
    const sess = { name, room: room || "Planning room", deckKey: deckKey || "fibonacci", isSpectator: !!isSpectator };
    sessionRef.current = sess;
    setSession(sess);
    try { localStorage.setItem("pp.name", name); } catch { /* noop */ }
    history.replaceState(null, "", `/room/${roomSlug(sess.room)}`);
    connect();
  }
  function leave() {
    userClosedRef.current = true;
    if (wsRef.current) try { wsRef.current.close(); } catch { /* noop */ }
    sessionRef.current = null;
    setSession(null);
    setSnapshot(null);
    setPendingVote(null);
    setStatus("idle");
    history.replaceState(null, "", "/");
  }

  // ── Actions (intents over the wire) ──
  function castVote(value) {
    if (snapshot && snapshot.round.revealed) return;
    if (me && me.isSpectator) return;
    setPendingVote({ value, ts: snapshot ? snapshot.round.startTs : null });
    send({ t: "castVote", value });
  }
  const reveal = () => send({ t: "reveal" });
  const revote = () => { setPendingVote(null); send({ t: "revote" }); };

  // ── Derived view model ──
  const baseRound = snapshot ? snapshot.round : EMPTY_ROUND;
  const roster = snapshot ? snapshot.roster : [];
  const you = snapshot ? snapshot.you : null;
  const me = you ? roster.find((p) => p.id === you.id) || null : null;

  let round = baseRound;
  if (pendingVote && you && !baseRound.revealed && baseRound.startTs === pendingVote.ts && baseRound.votes[you.id] !== pendingVote.value) {
    round = { ...baseRound, votes: { ...baseRound.votes, [you.id]: pendingVote.value } };
  }

  const voters = roster.filter((p) => !p.isSpectator);
  const voterIds = voters.map((p) => p.id);
  const allVoted = voters.length > 0 && voters.every((p) => round.votes[p.id] != null);
  const votedCount = voters.filter((p) => round.votes[p.id] != null).length;
  const deckKey = (snapshot && snapshot.deckKey) || (session && session.deckKey) || "fibonacci";
  const roomName = (snapshot && snapshot.roomName) || (session && session.room) || "Planning room";

  const value = {
    session, ready: !!snapshot, roster, round, voters, voterIds, me,
    allVoted, votedCount, deck: DECKS[deckKey], deckKey, roomName, status,
    join, leave, castVote, reveal, revote,
  };
  return React.createElement(PokerContext.Provider, { value }, children);
}

export function usePoker() {
  return React.useContext(PokerContext);
}
