// A card that reads as a physical object.
//
// Three things separate this from `<View style={{background:'#fff', borderWidth:1}}>`:
//
//  1. Double bezel. The content sits in an inner core, which sits in a slightly
//     tinted outer shell — like a glass plate in a machined tray. The inner
//     radius is computed (`bezel()`), not guessed, so the curves stay concentric
//     instead of fighting each other. Concentric curves are most of why premium
//     hardware looks premium.
//  2. The "white" is a gradient, not a fill. A dead #FFFFFF plane is the single
//     most recognisable tell of a generated interface; real surfaces catch light
//     unevenly.
//  3. Warm translucent hairlines instead of solid grey. A neutral grey line on a
//     cream ground looks like dirt; a warm line at 10% picks up whatever is
//     under it.

import { type ReactNode } from "react";
import { StyleSheet, View, type StyleProp, type ViewStyle } from "react-native";
import { LinearGradient } from "expo-linear-gradient";

import { bezel, elevation, gradients, palette, radii } from "@/src/lib/theme";

type Props = {
  children: ReactNode;
  /** "light" on canvas, "dark" for panels on the walnut/near-black grounds. */
  tone?: "light" | "dark";
  /** Outer corner radius. The inner core's radius is derived from it. */
  radius?: number;
  /** Shell thickness. 0 turns the bezel off and renders a single-layer card. */
  bezelPad?: number;
  depth?: keyof typeof elevation;
  /** Ring the shell in gold — for unlocked rewards, premium, active states. */
  accent?: boolean;
  style?: StyleProp<ViewStyle>;
  contentStyle?: StyleProp<ViewStyle>;
  testID?: string;
};

export function Surface({
  children,
  tone = "light",
  radius = radii.xl,
  bezelPad = 5,
  depth = "card",
  accent = false,
  style,
  contentStyle,
  testID,
}: Props) {
  const dark = tone === "dark";
  const innerRadius = bezelPad > 0 ? bezel(radius, bezelPad) : radius;

  const shell: ViewStyle = {
    borderRadius: radius,
    padding: bezelPad,
    backgroundColor: dark ? "rgba(245,239,226,0.06)" : "rgba(58,36,24,0.045)",
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: accent
      ? palette.borderGold
      : dark
        ? palette.borderDark
        : palette.border,
  };

  const core: ViewStyle = {
    borderRadius: innerRadius,
    overflow: "hidden",
    borderWidth: bezelPad > 0 ? StyleSheet.hairlineWidth : 0,
    borderColor: dark ? "rgba(245,239,226,0.08)" : "rgba(255,255,255,0.9)",
  };

  return (
    <View style={[shell, elevation[depth], style]} testID={testID}>
      {dark ? (
        <View style={[core, { backgroundColor: palette.surfaceDark }, contentStyle]}>
          {children}
        </View>
      ) : (
        <LinearGradient
          colors={gradients.surface}
          start={{ x: 0, y: 0 }}
          end={{ x: 0, y: 1 }}
          style={[core, contentStyle]}
        >
          {children}
        </LinearGradient>
      )}
    </View>
  );
}
