// ── Planning Poker · design system (ported from the Claude Design bundle) ──
// Style objects are reproduced verbatim from the source design system so the
// UI is pixel-identical; only the module wrapper changed (global React →
// imported React, UMD namespace → ES exports).
import React from "react";

const h = React.createElement;

// ── Avatar ──────────────────────────────────────────────────────────────
const AV_SIZES = { sm: 28, md: 36, lg: 48 };
const AV_PALETTE = [
  ["var(--blue-100)", "var(--blue-700)"],
  ["var(--gold-100)", "var(--gold-700)"],
  ["var(--green-100)", "var(--green-600)"],
  ["var(--ink-100)", "var(--ink-700)"],
  ["var(--blue-50)", "var(--blue-600)"],
];
function avHash(str = "") {
  let n = 0;
  for (let i = 0; i < str.length; i++) n = (n * 31 + str.charCodeAt(i)) | 0;
  return Math.abs(n);
}
export function Avatar({ name = "", src, size = "md", presence, style, ...rest }) {
  const px = AV_SIZES[size] || AV_SIZES.md;
  const initials = name.trim().split(/\s+/).map((w) => w[0]).slice(0, 2).join("").toUpperCase();
  const [bg, fg] = AV_PALETTE[avHash(name) % AV_PALETTE.length];
  const dot = { width: px * 0.28, height: px * 0.28 };
  const presenceColor =
    presence === "voted" ? "var(--success)"
    : presence === "thinking" ? "var(--gold-500)"
    : presence === "away" ? "var(--ink-300)"
    : null;
  return h("span", { ...rest, style: { position: "relative", display: "inline-flex", flex: "none", ...style } },
    h("span", {
      style: {
        width: px, height: px, borderRadius: "50%", overflow: "hidden", display: "flex",
        alignItems: "center", justifyContent: "center", background: src ? "var(--ink-100)" : bg,
        color: fg, fontFamily: "var(--font-body)", fontWeight: 700, fontSize: px * 0.4, letterSpacing: "0.01em",
      },
    }, src ? h("img", { src, alt: name, style: { width: "100%", height: "100%", objectFit: "cover" } }) : initials),
    presenceColor && h("span", {
      style: { position: "absolute", right: -1, bottom: -1, ...dot, background: presenceColor, borderRadius: "50%", border: "2px solid var(--white)" },
    }));
}

// ── Badge ───────────────────────────────────────────────────────────────
const BADGE_TONES = {
  neutral: { bg: "var(--ink-100)", fg: "var(--ink-700)" },
  brand: { bg: "var(--brand-soft)", fg: "var(--brand-press)" },
  accent: { bg: "var(--accent-soft)", fg: "var(--gold-700)" },
  success: { bg: "var(--success-soft)", fg: "var(--green-600)" },
  danger: { bg: "var(--danger-soft)", fg: "var(--red-600)" },
};
export function Badge({ children, tone = "neutral", dot = false, solid = false, style, ...rest }) {
  const t = BADGE_TONES[tone] || BADGE_TONES.neutral;
  const solidStyle = solid ? { background: t.fg, color: "var(--white)" } : { background: t.bg, color: t.fg };
  return h("span", {
    ...rest,
    style: {
      display: "inline-flex", alignItems: "center", gap: 6, fontFamily: "var(--font-body)", fontWeight: 600,
      fontSize: 12, lineHeight: 1, padding: "5px 10px", borderRadius: "var(--radius-pill)",
      letterSpacing: "0.01em", ...solidStyle, ...style,
    },
  }, dot && h("span", { style: { width: 6, height: 6, borderRadius: "50%", background: "currentColor", flex: "none" } }), children);
}

// ── Button ──────────────────────────────────────────────────────────────
const BTN_SIZES = {
  sm: { padding: "0 12px", height: 32, fontSize: 13, radius: "var(--radius-sm)", gap: 6 },
  md: { padding: "0 16px", height: 40, fontSize: 14, radius: "var(--radius-md)", gap: 8 },
  lg: { padding: "0 22px", height: 48, fontSize: 16, radius: "var(--radius-md)", gap: 10 },
};
const BTN_VARIANTS = {
  primary: { background: "var(--brand)", color: "var(--text-on-brand)", border: "1px solid transparent", boxShadow: "var(--shadow-xs)", "--hover-bg": "var(--brand-hover)", "--press-bg": "var(--brand-press)" },
  secondary: { background: "var(--white)", color: "var(--text-strong)", border: "1px solid var(--border-default)", boxShadow: "var(--shadow-xs)", "--hover-bg": "var(--ink-50)", "--press-bg": "var(--ink-100)" },
  ghost: { background: "transparent", color: "var(--text-body)", border: "1px solid transparent", "--hover-bg": "var(--ink-100)", "--press-bg": "var(--ink-200)" },
  accent: { background: "var(--accent)", color: "var(--ink-900)", border: "1px solid transparent", boxShadow: "var(--shadow-xs)", "--hover-bg": "var(--gold-400)", "--press-bg": "var(--gold-600)" },
  danger: { background: "var(--danger)", color: "var(--white)", border: "1px solid transparent", "--hover-bg": "var(--red-600)", "--press-bg": "var(--red-600)" },
};
export function Button({ children, variant = "primary", size = "md", icon, iconRight, block = false, disabled = false, style, ...rest }) {
  const sz = BTN_SIZES[size] || BTN_SIZES.md;
  const vr = BTN_VARIANTS[variant] || BTN_VARIANTS.primary;
  const [hover, setHover] = React.useState(false);
  const [press, setPress] = React.useState(false);
  const bg = disabled ? undefined : press && vr["--press-bg"] ? vr["--press-bg"] : hover && vr["--hover-bg"] ? vr["--hover-bg"] : vr.background;
  return h("button", {
    ...rest,
    disabled,
    onMouseEnter: () => setHover(true),
    onMouseLeave: () => { setHover(false); setPress(false); },
    onMouseDown: () => setPress(true),
    onMouseUp: () => setPress(false),
    style: {
      display: block ? "flex" : "inline-flex", width: block ? "100%" : undefined, alignItems: "center",
      justifyContent: "center", gap: sz.gap, fontFamily: "var(--font-body)", fontWeight: 600, fontSize: sz.fontSize,
      lineHeight: 1, height: sz.height, padding: sz.padding, borderRadius: sz.radius,
      cursor: disabled ? "not-allowed" : "pointer",
      transition: "background var(--dur-fast) var(--ease-out), transform var(--dur-fast) var(--ease-out)",
      transform: press && !disabled ? "translateY(0.5px) scale(0.985)" : "none",
      opacity: disabled ? 0.5 : 1, whiteSpace: "nowrap", ...vr, background: bg, ...style,
    },
  }, icon && h("span", { style: { display: "inline-flex", flex: "none" } }, icon), children,
     iconRight && h("span", { style: { display: "inline-flex", flex: "none" } }, iconRight));
}

// ── Card ────────────────────────────────────────────────────────────────
export function Card({ children, padding = "var(--space-5)", interactive = false, style, ...rest }) {
  const [hover, setHover] = React.useState(false);
  return h("div", {
    ...rest,
    onMouseEnter: () => interactive && setHover(true),
    onMouseLeave: () => interactive && setHover(false),
    style: {
      background: "var(--surface-card)", border: "1px solid var(--border-subtle)", borderRadius: "var(--radius-lg)",
      boxShadow: hover ? "var(--shadow-md)" : "var(--shadow-sm)", padding,
      transition: "box-shadow var(--dur-base) var(--ease-out), transform var(--dur-base) var(--ease-out)",
      transform: hover ? "translateY(-2px)" : "none", cursor: interactive ? "pointer" : "default", ...style,
    },
  }, children);
}

// ── Input ───────────────────────────────────────────────────────────────
export function Input({ label, hint, error, icon, size = "md", style, id, ...rest }) {
  const height = size === "lg" ? 48 : size === "sm" ? 34 : 40;
  const [focus, setFocus] = React.useState(false);
  const inputId = id || (label ? "in-" + label.replace(/\s+/g, "-").toLowerCase() : undefined);
  return h("div", { style: { display: "flex", flexDirection: "column", gap: 6, fontFamily: "var(--font-body)" } },
    label && h("label", { htmlFor: inputId, style: { fontSize: 13, fontWeight: 600, color: "var(--text-strong)" } }, label),
    h("div", {
      style: {
        display: "flex", alignItems: "center", gap: 8, height, padding: "0 12px", background: "var(--white)",
        borderRadius: "var(--radius-md)",
        border: `1px solid ${error ? "var(--danger)" : focus ? "var(--brand)" : "var(--border-default)"}`,
        boxShadow: focus && !error ? "var(--ring-brand)" : "none",
        transition: "border-color var(--dur-fast) var(--ease-out), box-shadow var(--dur-fast) var(--ease-out)",
      },
    }, icon && h("span", { style: { display: "inline-flex", color: "var(--text-faint)", flex: "none" } }, icon),
       h("input", {
         ...rest, id: inputId, onFocus: () => setFocus(true), onBlur: () => setFocus(false),
         style: { flex: 1, border: "none", outline: "none", background: "transparent", fontFamily: "var(--font-body)", fontSize: 14, color: "var(--text-strong)", minWidth: 0, ...style },
       })),
    (hint || error) && h("span", { style: { fontSize: 12, color: error ? "var(--danger)" : "var(--text-muted)" } }, error || hint));
}

// ── PlayingCard ───────────────────────────────────────────────────────────
const PC_SIZES = {
  sm: { w: 56, h: 84, num: 30, corner: 11 },
  md: { w: 84, h: 124, num: 46, corner: 13 },
  lg: { w: 116, h: 168, num: 64, corner: 15 },
};
export function PlayingCard({ value, size = "md", selected = false, faceDown = false, disabled = false, onSelect, style, ...rest }) {
  const s = PC_SIZES[size] || PC_SIZES.md;
  const [hover, setHover] = React.useState(false);
  const isSpecial = value === "?" || value === "☕" || value === "coffee";
  const disp = value === "coffee" ? "☕" : value;
  const lift = selected ? -16 : hover && !disabled ? -8 : 0;
  const face = (front) =>
    h("div", {
      style: {
        position: "absolute", inset: 0, backfaceVisibility: "hidden", WebkitBackfaceVisibility: "hidden",
        borderRadius: "var(--radius-xl)", display: "flex", alignItems: "center", justifyContent: "center",
        transform: front ? "none" : "rotateY(180deg)", background: front ? "var(--white)" : "var(--brand)",
        border: front ? `2px solid ${selected ? "var(--brand)" : "var(--border-default)"}` : "2px solid var(--brand-press)",
        boxShadow: "inset 0 1px 0 rgba(255,255,255,0.6)", overflow: "hidden",
      },
    }, front
      ? h(React.Fragment, null,
          h("span", { style: { position: "absolute", top: 8, left: 10, fontFamily: "var(--font-mono)", fontSize: s.corner, fontWeight: 600, color: isSpecial ? "var(--accent)" : selected ? "var(--brand)" : "var(--text-muted)" } }, disp),
          h("span", { style: { position: "absolute", bottom: 8, right: 10, fontFamily: "var(--font-mono)", fontSize: s.corner, fontWeight: 600, transform: "rotate(180deg)", color: isSpecial ? "var(--accent)" : selected ? "var(--brand)" : "var(--text-muted)" } }, disp),
          h("span", { style: { fontFamily: "var(--font-display)", fontWeight: 700, fontSize: s.num, letterSpacing: "-0.03em", lineHeight: 1, color: isSpecial ? "var(--accent)" : selected ? "var(--brand)" : "var(--text-strong)" } }, disp))
      : h("span", { style: { width: "62%", height: "62%", borderRadius: "var(--radius-md)", border: "2px solid rgba(255,255,255,0.45)", display: "flex", alignItems: "center", justifyContent: "center", color: "rgba(255,255,255,0.92)", fontFamily: "var(--font-display)", fontWeight: 700, fontSize: s.num * 0.5, letterSpacing: "-0.02em" } }, "pp"));
  return h("button", {
    ...rest, type: "button", disabled,
    onMouseEnter: () => setHover(true), onMouseLeave: () => setHover(false),
    onClick: () => !disabled && onSelect && onSelect(value),
    "aria-pressed": selected,
    style: {
      all: "unset", position: "relative", width: s.w, height: s.h, cursor: disabled ? "default" : "pointer",
      perspective: 800, transform: `translateY(${lift}px)`, transition: "transform var(--dur-base) var(--ease-spring)",
      opacity: disabled ? 0.45 : 1, flex: "none",
      filter: selected ? "drop-shadow(0 14px 22px rgba(58,99,245,0.28))" : "drop-shadow(var(--shadow-card))", ...style,
    },
  }, h("div", {
    style: { position: "relative", width: "100%", height: "100%", transformStyle: "preserve-3d", transition: "transform var(--dur-slow) var(--ease-spring)", transform: faceDown ? "rotateY(180deg)" : "none" },
  }, face(true), face(false)));
}

// ── Deck ────────────────────────────────────────────────────────────────
export const FIBONACCI = ["0", "1", "2", "3", "5", "8", "13", "21", "?", "coffee"];
export function Deck({ deck = FIBONACCI, value, onSelect, size = "md", style, ...rest }) {
  return h("div", {
    ...rest, role: "radiogroup",
    style: { display: "flex", flexWrap: "wrap", gap: "var(--space-3)", alignItems: "flex-end", ...style },
  }, deck.map((v) => h(PlayingCard, { key: String(v), value: v, size, selected: String(value) === String(v), onSelect })));
}

export const NS = { Avatar, Badge, Button, Card, Input, PlayingCard, Deck, FIBONACCI };
