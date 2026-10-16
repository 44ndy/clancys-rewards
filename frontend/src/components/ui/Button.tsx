// The app's buttons.
//
// The trailing icon is never naked next to the label — it sits in its own circular
// well, flush with the button's inner padding. That nesting is what stops a pill
// from reading as a generated rectangle: it gives the control an interior.
//
// Every variant clears 4.5:1 on its own fill (see src/lib/theme.ts) and every
// variant is at least 52pt tall, comfortably over the 44pt touch minimum.

import { ActivityIndicator, StyleSheet, Text, View, type StyleProp, type ViewStyle } from "react-native";
import { Ionicons } from "@expo/vector-icons";

import { palette, radii, spacing, type } from "@/src/lib/theme";
import { PressableScale } from "./PressableScale";

type Variant = "gold" | "emerald" | "ghostDark" | "ghostLight";

const FILL: Record<Variant, { bg: string; fg: string; border?: string; well: string }> = {
  // Dark ink on gold: 7.6:1.
  gold: { bg: palette.gold, fg: palette.surfaceDarker, well: "rgba(11,8,5,0.14)" },
  // Ivory on emerald: 8.0:1.
  emerald: { bg: palette.emerald, fg: palette.ivory, well: "rgba(245,239,226,0.18)" },
  // On dark grounds.
  ghostDark: {
    bg: "rgba(245,239,226,0.06)",
    fg: palette.ivory,
    border: "rgba(245,239,226,0.28)",
    well: "rgba(245,239,226,0.14)",
  },
  // On canvas.
  ghostLight: {
    bg: "transparent",
    fg: palette.textPrimary,
    border: palette.borderStrong,
    well: "rgba(27,19,12,0.07)",
  },
};

export function Button({
  label,
  onPress,
  variant = "gold",
  icon,
  loading,
  disabled,
  style,
  testID,
}: {
  label: string;
  onPress?: () => void;
  variant?: Variant;
  /** Rendered inside its own circular well at the trailing edge. */
  icon?: keyof typeof Ionicons.glyphMap;
  loading?: boolean;
  disabled?: boolean;
  style?: StyleProp<ViewStyle>;
  testID?: string;
}) {
  const c = FILL[variant];

  return (
    <PressableScale
      onPress={onPress}
      disabled={disabled || loading}
      testID={testID}
      accessibilityRole="button"
      accessibilityLabel={label}
      style={[
        styles.base,
        {
          backgroundColor: c.bg,
          borderWidth: c.border ? StyleSheet.hairlineWidth : 0,
          borderColor: c.border,
        },
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={c.fg} />
      ) : (
        <>
          {/* Spacer mirrors the icon well so the label stays optically centred. */}
          {icon ? <View style={styles.well} /> : null}
          <Text style={[type.button, { color: c.fg }]} numberOfLines={1}>
            {label}
          </Text>
          {icon ? (
            <View style={[styles.well, { backgroundColor: c.well }]}>
              <Ionicons name={icon} size={16} color={c.fg} />
            </View>
          ) : null}
        </>
      )}
    </PressableScale>
  );
}

const styles = StyleSheet.create({
  base: {
    minHeight: 54,
    borderRadius: radii.full,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.sm,
    paddingHorizontal: 6,
    paddingVertical: 6,
  },
  well: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: "center",
    justifyContent: "center",
  },
});
