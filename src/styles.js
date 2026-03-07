// ─────────────────────────────────────────────────────────────────────────────
// ETTR — SHARED STYLES
// Import from here in every component — change once, updates everywhere.
// ─────────────────────────────────────────────────────────────────────────────

// Color palette
export const C = {
  bg:     "#070d1a",
  side:   "#0c1526",
  card1:  "#111e35",
  card2:  "#162440",
  border: "#1e3a5f",
  accent: "#3b82f6",
  text:   "#e2e8f0",
  muted:  "#475569",
  dim:    "#64748b",
  green:  "#22c55e",
  red:    "#ef4444",
  yellow: "#f59e0b",
};

// Card container style factory
export const card = (x = {}) => ({
  background:   C.card1,
  border:       `1px solid ${C.border}`,
  borderRadius: 12,
  padding:      20,
  ...x,
});

// Field label
export const lbl = {
  fontSize:      10,
  color:         C.dim,
  letterSpacing: 1.5,
  marginBottom:  4,
  display:       "block",
  textTransform: "uppercase",
};

// Text / select input
// NOTE: fontSize 16px prevents iOS Safari from auto-zooming on focus
export const inp = {
  width:       "100%",
  background:  C.bg,
  border:      `1px solid ${C.border}`,
  borderRadius: 8,
  padding:     "10px 13px",
  color:       C.text,
  fontFamily:  "inherit",
  fontSize:    16,            // 16px = no iOS zoom
  boxSizing:   "border-box",
  outline:     "none",
  WebkitAppearance: "none",   // clean look on Safari/iOS
};

// Button style factory
export const btn = (bg = C.accent, col = "#fff", extra = {}) => ({
  background:             bg,
  color:                  col,
  border:                 "none",
  borderRadius:           8,
  padding:                "10px 20px",
  cursor:                 "pointer",
  fontFamily:             "inherit",
  fontWeight:             700,
  fontSize:               12,
  letterSpacing:          0.5,
  WebkitTapHighlightColor: "transparent",  // no blue flash on iOS tap
  touchAction:            "manipulation",  // no 300ms tap delay on iOS
  ...extra,
});

// Ghost / outline button
export const ghost = {
  background:             "transparent",
  border:                 `1px solid ${C.border}`,
  color:                  C.muted,
  borderRadius:           8,
  padding:                "10px 16px",
  cursor:                 "pointer",
  fontFamily:             "inherit",
  fontSize:               12,
  fontWeight:             600,
  WebkitTapHighlightColor: "transparent",
  touchAction:            "manipulation",
};
