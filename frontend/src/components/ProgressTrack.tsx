// "Your Progress" — one dot per visit needed, filled up to where you are.
//
// Motion: each dot scales and fades in on mount, staggered 60ms. Purpose is
// state indication, not delight — the stagger makes the eye travel left-to-right
// along the track, which is the direction progress actually moves. Entrances are
// per-index, so each dot memoizes its own builder (an inline chain in JSX rebuilds
// the builder on every render).
//
// The dot row only works while the goal is small. Past 8 the dots stop being
// countable and become decoration, so the component falls back to a rail — same
// information, honest at any scale.

import { useMemo } from "react";
import { StyleSheet, Text, View } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import Animated, { FadeIn, ReduceMotion } from "react-native-reanimated";
import { Ionicons } from "@expo/vector-icons";

import { gradients, palette, radii, spacing, type } from "@/src/lib/theme";

const MAX_DOTS = 8;

export function ProgressTrack({ visits, goal }: { visits: number; goal: number }) {
  const reachable = Math.max(goal, 1);
  const done = Math.min(visits, reachable);

  return (
    <View style={styles.wrap}>
      <Text style={styles.title}>Your Progress</Text>

      {reachable <= MAX_DOTS ? (
        <View style={styles.dotRow}>
          {Array.from({ length: reachable }, (_, i) => (
            <Dot key={i} index={i} filled={i < done} current={i === done} />
          ))}
        </View>
      ) : (
        <View style={styles.railWrap}>
          <View style={styles.rail}>
            <LinearGradient
              colors={gradients.gold}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={[styles.railFill, { width: `${(done / reachable) * 100}%` }]}
            />
          </View>
          <Text style={styles.railLabel}>
            {done} of {reachable} visits
          </Text>
        </View>
      )}
    </View>
  );
}

function Dot({ index, filled, current }: { index: number; filled: boolean; current: boolean }) {
  const entering = useMemo(
    () => FadeIn.duration(280).delay(index * 60).reduceMotion(ReduceMotion.System),
    [index],
  );

  return (
    <Animated.View entering={entering} style={styles.dotCol}>
      <View style={[styles.dot, filled && styles.dotFilled, current && styles.dotCurrent]}>
        {filled ? <Ionicons name="checkmark" size={15} color={palette.ivory} /> : null}
      </View>
      <Text style={[styles.dotNum, (filled || current) && styles.dotNumActive]}>{index + 1}</Text>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    backgroundColor: palette.surfaceMuted,
    borderRadius: radii.xl,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: palette.border,
    padding: spacing.md + 2,
  },
  title: { ...type.h3, fontSize: 15.5, color: palette.textPrimary },

  dotRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    marginTop: spacing.md,
  },
  dotCol: { alignItems: "center", gap: 6, flex: 1 },
  dot: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: palette.border,
    backgroundColor: palette.surface,
  },
  dotFilled: { backgroundColor: palette.emerald, borderColor: palette.emerald },
  dotCurrent: { backgroundColor: palette.gold, borderColor: palette.gold },
  dotNum: { ...type.mono, fontSize: 11, color: palette.textMuted },
  dotNumActive: { color: palette.textPrimary },

  railWrap: { marginTop: spacing.md, gap: 8 },
  rail: {
    height: 8,
    borderRadius: 4,
    overflow: "hidden",
    backgroundColor: "rgba(27,19,12,0.09)",
  },
  railFill: { height: "100%", borderRadius: 4 },
  railLabel: { ...type.mono, fontSize: 12, color: palette.goldOnLight },
});
