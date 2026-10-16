// Clancy's design system — Irish heritage luxury.
//
// Three rules this file exists to enforce:
//   1. Every colour pairing here meets WCAG AA (4.5:1) for its intended surface.
//      Gold is gorgeous on walnut and illegible on ivory — so there are two golds,
//      and the name tells you which surface it belongs to. Never guess.
//   2. Custom fonts do NOT synthesise weight or italic on Android. `fontWeight: "700"`
//      on a 400-weight family silently renders regular, or fake-bolds it badly.
//      So weight lives in the family name, and `type` below pairs them correctly.
//   3. Depth comes from layering (shell + core + hairline + gradient), not from one
//      dark drop shadow. See `elevation` and the bezel recipe at the bottom.

import { Platform, type TextStyle } from "react-native";

export const palette = {
  // ── Brand ────────────────────────────────────────────────────────────────
  emerald: "#0E5C3A",
  emeraldDark: "#073A24",
  emeraldDeep: "#052618",
  walnut: "#3A2418",
  walnutLight: "#5B3A24",
  gold: "#C9A961", // ON DARK ONLY — 8.5:1 on walnut, 2.2:1 on white (illegible)
  goldLight: "#E2C684", // ON DARK ONLY
  goldDeep: "#8A7234",
  ivory: "#F5EFE2",
  ivoryMuted: "#E8E0CC",

  // ── Contrast-safe on light surfaces (verified AA on #FFF and #F8F4EA) ────
  goldOnLight: "#866C2F", // 5.00:1 on white · 4.55:1 on canvas — the gold for ivory
  emeraldOnLight: "#0E5C3A", // 8.6:1 on white — already safe

  // ── Surfaces ─────────────────────────────────────────────────────────────
  background: "#0B0805",
  canvas: "#F8F4EA",
  surface: "#FFFFFF",
  surfaceRaised: "#FFFDF9", // card top in the surface gradient — stops dead-flat white
  surfaceMuted: "#F1EBE0",
  surfaceDark: "#1B130C",
  surfaceDarker: "#0B0805",

  // ── Text ─────────────────────────────────────────────────────────────────
  textOnDark: "#F5EFE2",
  textOnDarkMuted: "rgba(245, 239, 226, 0.72)",
  textPrimary: "#1B130C", // 17.6:1 on white
  textSecondary: "#5A4A3A", // 7.4:1 on white
  textMuted: "#7C6D5D", // 5.00:1 on white · 4.55:1 on canvas (was #8C7C6B — failed)

  // ── Lines ────────────────────────────────────────────────────────────────
  // Warm translucent hairlines, not flat grey — they pick up whatever is beneath.
  border: "rgba(27, 19, 12, 0.10)",
  borderStrong: "rgba(27, 19, 12, 0.16)",
  borderDark: "rgba(245, 239, 226, 0.14)",
  borderGold: "rgba(201, 169, 97, 0.34)",

  // ── Status ───────────────────────────────────────────────────────────────
  success: "#2E6B39", // darkened from #3A7D44 for AA on white (5.1:1)
  successOnDark: "#6FBF7F",
  warning: "#8A6D1F",
  error: "#8E3535", // 6.0:1 on white
  errorOnDark: "#E08A8A",
  errorSurface: "#FBEDED",

  overlay: "rgba(11, 8, 5, 0.55)",
  scrim: "rgba(11, 8, 5, 0.78)",
} as const;

export const spacing = { xs: 4, sm: 8, md: 16, lg: 24, xl: 32, xxl: 48, huge: 64 };

// Concentric radii: an inner core inside a shell padded by `p` needs `outer - p`
// or the curves fight each other. `bezel()` does that arithmetic.
export const radii = { sm: 8, md: 14, lg: 20, xl: 28, xxl: 36, full: 999 };
export const bezel = (outer: number, pad: number) => Math.max(outer - pad, 4);

// ── Typography ─────────────────────────────────────────────────────────────
// Family names come from @expo-google-fonts and must match the useFonts() keys
// loaded in app/_layout.tsx exactly.
export const fonts = {
  // Playfair Display — display/headings. Weight is in the name.
  serifRegular: "PlayfairDisplay_400Regular",
  serifMedium: "PlayfairDisplay_500Medium",
  serifSemiBold: "PlayfairDisplay_600SemiBold",
  serifBold: "PlayfairDisplay_700Bold",
  serifItalic: "PlayfairDisplay_400Regular_Italic",

  // Manrope — UI/body. No italic exists for this family; use serifItalic instead.
  sansRegular: "Manrope_400Regular",
  sansMedium: "Manrope_500Medium",
  sansSemiBold: "Manrope_600SemiBold",
  sansBold: "Manrope_700Bold",
  sansExtraBold: "Manrope_800ExtraBold",

  // Back-compat aliases for code not yet migrated to `type`.
  heading: "PlayfairDisplay_700Bold",
  serif: "PlayfairDisplay_700Bold",
  body: "Manrope_400Regular",
} as const;

/**
 * Prebuilt text styles. Always spread one of these instead of hand-pairing a
 * family with a fontWeight — that pairing is the #1 source of "looks fine in the
 * simulator, renders as Roboto on a Pixel".
 */
export const type = {
  // Display — the restaurant name, hero moments.
  display: {
    fontFamily: fonts.serifBold,
    fontSize: 56,
    lineHeight: 60,
    letterSpacing: -1.6,
  } as TextStyle,
  displaySm: {
    fontFamily: fonts.serifBold,
    fontSize: 40,
    lineHeight: 46,
    letterSpacing: -1,
  } as TextStyle,

  // Headings.
  h1: { fontFamily: fonts.serifBold, fontSize: 30, lineHeight: 36, letterSpacing: -0.5 } as TextStyle,
  h2: { fontFamily: fonts.serifBold, fontSize: 24, lineHeight: 30, letterSpacing: -0.3 } as TextStyle,
  h3: { fontFamily: fonts.serifSemiBold, fontSize: 18, lineHeight: 24, letterSpacing: -0.2 } as TextStyle,

  // Editorial italic — taglines, descriptions, the "voice" of the house.
  quote: { fontFamily: fonts.serifItalic, fontSize: 15, lineHeight: 23 } as TextStyle,
  quoteSm: { fontFamily: fonts.serifItalic, fontSize: 13, lineHeight: 19 } as TextStyle,

  // Body / UI.
  body: { fontFamily: fonts.sansRegular, fontSize: 15, lineHeight: 22 } as TextStyle,
  bodySm: { fontFamily: fonts.sansRegular, fontSize: 13, lineHeight: 19 } as TextStyle,
  bodyMedium: { fontFamily: fonts.sansMedium, fontSize: 15, lineHeight: 22 } as TextStyle,
  strong: { fontFamily: fonts.sansSemiBold, fontSize: 15, lineHeight: 22 } as TextStyle,

  // Buttons.
  button: { fontFamily: fonts.sansBold, fontSize: 15, letterSpacing: 0.2 } as TextStyle,
  buttonSm: { fontFamily: fonts.sansBold, fontSize: 13, letterSpacing: 0.2 } as TextStyle,

  // Eyebrow — the small tracked-out caps above a heading. Minimum 11px:
  // below that, letterSpacing this wide stops being readable at arm's length.
  eyebrow: {
    fontFamily: fonts.sansBold,
    fontSize: 11,
    letterSpacing: 2.4,
    lineHeight: 14,
  } as TextStyle,

  // Data labels under numbers.
  label: {
    fontFamily: fonts.sansSemiBold,
    fontSize: 11,
    letterSpacing: 1.2,
    lineHeight: 14,
  } as TextStyle,

  // Numerals — tabular so columns of figures don't jitter as they update.
  numeral: {
    fontFamily: fonts.serifBold,
    fontSize: 28,
    lineHeight: 32,
    letterSpacing: -0.5,
    fontVariant: ["tabular-nums"],
  } as TextStyle,
  numeralSm: {
    fontFamily: fonts.serifBold,
    fontSize: 18,
    lineHeight: 22,
    fontVariant: ["tabular-nums"],
  } as TextStyle,
  mono: {
    fontFamily: fonts.sansSemiBold,
    fontSize: 13,
    fontVariant: ["tabular-nums"],
  } as TextStyle,
} as const;

// ── Elevation ──────────────────────────────────────────────────────────────
// RN allows one shadow per View, so real depth is built by nesting (see bezel
// recipe) rather than by stacking shadows on a single node. These are tuned warm
// — a neutral black shadow on a cream ground reads as dirt.
const shadowColorWarm = "#3A2418";

export const elevation = {
  // Barely there — rests on the surface. Rows, chips.
  hairline: Platform.select({
    ios: { shadowColor: shadowColorWarm, shadowOpacity: 0.05, shadowRadius: 3, shadowOffset: { width: 0, height: 1 } },
    default: { elevation: 1 },
  }) as object,
  // Cards at rest.
  card: Platform.select({
    ios: { shadowColor: shadowColorWarm, shadowOpacity: 0.08, shadowRadius: 14, shadowOffset: { width: 0, height: 6 } },
    default: { elevation: 4 },
  }) as object,
  // Hero card, the loyalty pass — the thing you want to feel liftable.
  lifted: Platform.select({
    ios: { shadowColor: shadowColorWarm, shadowOpacity: 0.18, shadowRadius: 28, shadowOffset: { width: 0, height: 14 } },
    default: { elevation: 10 },
  }) as object,
  // Sheets, modals.
  overlay: Platform.select({
    ios: { shadowColor: "#000", shadowOpacity: 0.3, shadowRadius: 32, shadowOffset: { width: 0, height: -6 } },
    default: { elevation: 16 },
  }) as object,
  // Gold glow for the QR / unlocked states.
  glow: Platform.select({
    ios: { shadowColor: palette.gold, shadowOpacity: 0.45, shadowRadius: 22, shadowOffset: { width: 0, height: 6 } },
    default: { elevation: 8 },
  }) as object,
};

// Back-compat aliases.
export const shadow = {
  soft: elevation.hairline,
  card: elevation.card,
  gold: elevation.glow,
};

// ── Gradients ──────────────────────────────────────────────────────────────
export const gradients = {
  hero: ["#0E5C3A", "#073A24", "#052618"] as const,
  walnut: ["#42291A", "#1F150D", "#0B0805"] as const,
  gold: ["#E2C684", "#C9A961", "#8A7234"] as const,
  emeraldGold: ["#0E5C3A", "#1B130C"] as const,
  // Applied to "white" cards so they aren't a dead flat fill.
  surface: ["#FFFDF9", "#FFFFFF"] as const,
  // Scrim under text sitting on photography — sized so the text never floats
  // on an unpredictable part of the image.
  photoScrim: ["transparent", "rgba(11,8,5,0.55)", "rgba(11,8,5,0.92)"] as const,
};

// ── Motion ─────────────────────────────────────────────────────────────────
// Reanimated's built-in easings are as weak as CSS's. These are the curves used
// across the app; never `ease-in` on UI — it delays the moment being watched.
export const motion = {
  easeOut: [0.23, 1, 0.32, 1] as const,
  easeInOut: [0.77, 0, 0.175, 1] as const,
  sheet: [0.32, 0.72, 0, 1] as const,
  duration: { press: 120, chip: 180, enter: 420, hero: 620 },
  // Springs use Apple's two designer params (duration + dampingRatio).
  spring: { settle: { duration: 400, dampingRatio: 1 }, snap: { duration: 400, dampingRatio: 0.8 } },
  pressScale: 0.97,
};
