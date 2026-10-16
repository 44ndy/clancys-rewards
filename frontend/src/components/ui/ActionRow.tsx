// The full-width action rows: "Show QR Pass", "Refresh Card".
//
// Two motions, both feedback, both cheap:
//
//   · The chevron slides 4px right while the finger is down. It rides the same
//     shared value as the row's press scale, so it costs one worklet, not two,
//     and it can never desync from the press.
//   · `spinning` rotates the leading icon. That one is state indication, not
//     decoration — it only turns while work is actually in flight, and it stops
//     the moment the work lands. A spinner that runs when nothing is happening
//     is a lie about the app's state.
//
// Both are transform-only, so neither triggers a layout pass, and both drop out
// under Reduce Motion while the colour/opacity feedback stays — the press still
// has to be perceivable when motion is off.

import { useEffect } from "react";
import { Pressable, StyleSheet, Text, View, type StyleProp, type ViewStyle } from "react-native";
import Animated, {
  Easing,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withRepeat,
  withTiming,
  cancelAnimation,
} from "react-native-reanimated";
import { Ionicons } from "@expo/vector-icons";

import { motion, palette, radii, spacing, type } from "@/src/lib/theme";

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);
const EASE_OUT = Easing.bezier(...motion.easeOut);

type Tone = "solid" | "outline";

export function ActionRow({
  icon,
  label,
  onPress,
  tone = "solid",
  spinning = false,
  disabled,
  style,
  testID,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  onPress?: () => void;
  tone?: Tone;
  /** Rotates the leading icon — only while real work is in flight. */
  spinning?: boolean;
  disabled?: boolean;
  style?: StyleProp<ViewStyle>;
  testID?: string;
}) {
  const pressed = useSharedValue(0);
  const spin = useSharedValue(0);
  const reduced = useReducedMotion();
  const solid = tone === "solid";

  useEffect(() => {
    if (spinning && !reduced) {
      spin.set(0);
      spin.set(withRepeat(withTiming(360, { duration: 900, easing: Easing.linear }), -1, false));
    } else {
      cancelAnimation(spin);
      spin.set(withTiming(0, { duration: 200, easing: EASE_OUT }));
    }
  }, [spinning, reduced, spin]);

  const rowStyle = useAnimatedStyle(() => ({
    transform: reduced ? [] : [{ scale: 1 - 0.03 * pressed.get() }],
    opacity: disabled ? 0.45 : 1 - 0.1 * pressed.get(),
  }));

  // Chevron leans toward where the tap is about to take you.
  const chevronStyle = useAnimatedStyle(() => ({
    transform: reduced ? [] : [{ translateX: 4 * pressed.get() }],
  }));

  const iconStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${spin.get()}deg` }],
  }));

  const fg = solid ? palette.ivory : palette.textPrimary;

  return (
    <AnimatedPressable
      onPress={onPress}
      disabled={disabled}
      hitSlop={8}
      pressRetentionOffset={{ top: 12, bottom: 12, left: 12, right: 12 }}
      onPressIn={() => pressed.set(withTiming(1, { duration: motion.duration.press, easing: EASE_OUT }))}
      onPressOut={() => pressed.set(withTiming(0, { duration: motion.duration.press + 40, easing: EASE_OUT }))}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled: !!disabled, busy: spinning }}
      testID={testID}
      style={[styles.row, solid ? styles.solid : styles.outline, rowStyle, style]}
    >
      <View style={[styles.iconWell, solid ? styles.iconWellSolid : styles.iconWellOutline]}>
        <Animated.View style={iconStyle}>
          <Ionicons name={icon} size={18} color={solid ? palette.gold : palette.goldOnLight} />
        </Animated.View>
      </View>

      <Text style={[styles.label, { color: fg }]} numberOfLines={1}>
        {label}
      </Text>

      <Animated.View style={chevronStyle}>
        <Ionicons
          name="chevron-forward"
          size={18}
          color={solid ? "rgba(245,239,226,0.55)" : palette.textMuted}
        />
      </Animated.View>
    </AnimatedPressable>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    minHeight: 60,
    paddingHorizontal: spacing.md,
    borderRadius: radii.lg,
    borderWidth: StyleSheet.hairlineWidth,
  },
  solid: { backgroundColor: "#0C3623", borderColor: palette.borderGold },
  outline: { backgroundColor: palette.surface, borderColor: palette.border },
  iconWell: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  iconWellSolid: { backgroundColor: "rgba(201,169,97,0.16)" },
  iconWellOutline: { backgroundColor: "rgba(134,108,47,0.10)" },
  label: { ...type.strong, fontSize: 15, flex: 1 },
});
