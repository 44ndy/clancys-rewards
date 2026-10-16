// The membership pass — the app's signature object.
//
// Motion here, and why each piece earns its place:
//   · The ring sweeps 0 → ratio once on mount. Purpose: state indication — it
//     shows you *gained* ground rather than just reporting a number. Occasional
//     tier (once per screen entry), so it gets the full 1.1s.
//   · Nothing loops. A shimmer or a glow pulse on a card you look at daily is
//     decoration, and decoration you can't turn off becomes noise.
//
// Under Reduce Motion the ring snaps straight to its value: the number it
// encodes still has to be correct, so the animation is what drops, not the data.

import { useEffect, useMemo } from "react";
import { StyleSheet, Text, View } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import Animated, {
  Easing,
  useAnimatedProps,
  useReducedMotion,
  useSharedValue,
  withTiming,
} from "react-native-reanimated";
import Svg, { Circle, Defs, LinearGradient as SvgLG, Stop } from "react-native-svg";
import { Ionicons } from "@expo/vector-icons";

import { elevation, motion, palette, radii, spacing, type } from "@/src/lib/theme";
import { BrandMark } from "./brand/BrandMark";
import { Grain } from "./ui/Grain";
import { PressableScale } from "./ui/PressableScale";

const AnimatedCircle = Animated.createAnimatedComponent(Circle);
const EASE_OUT = Easing.bezier(...motion.easeOut);

const RING = 86;
const STROKE = 7;
const R = (RING - STROKE) / 2;
const CIRC = 2 * Math.PI * R;

type Props = {
  visits: number;
  goal: number;
  memberName: string;
  nextRewardName?: string | null;
  onPressReward?: () => void;
};

export function LoyaltyCard({
  visits,
  goal,
  memberName,
  nextRewardName,
  onPressReward,
}: Props) {
  const progress = useSharedValue(0);
  const reduced = useReducedMotion();
  const ratio = useMemo(() => (goal > 0 ? Math.min(visits / goal, 1) : 0), [visits, goal]);

  useEffect(() => {
    progress.set(reduced ? ratio : withTiming(ratio, { duration: 1100, easing: EASE_OUT }));
  }, [ratio, progress, reduced]);

  const ringProps = useAnimatedProps(() => ({
    strokeDashoffset: CIRC * (1 - progress.get()),
  }));

  const remaining = Math.max(goal - visits, 0);

  return (
    <View style={[styles.card, elevation.lifted]} testID="loyalty-card">
      <LinearGradient
        colors={["#124A31", "#0C3623", "#07281A"]}
        start={{ x: 0.15, y: 0 }}
        end={{ x: 0.9, y: 1 }}
        style={StyleSheet.absoluteFill}
      />
      <Grain opacity={0.08} />
      {/* Inset rule frame — the device that reads as engraved rather than as a
          rounded rectangle with a border. */}
      <View pointerEvents="none" style={styles.frame} />

      <View style={styles.inner}>
        {/* ── Crest ──────────────────────────────────────────────────────── */}
        {/* The official roundel carries the wordmark, the date and the city
            already, so nothing here re-sets them in Playfair — one brand per
            card. Ivory rather than gold: the card ground is emerald, and gold
            line art this fine goes muddy on it. */}
        <View style={styles.crest}>
          <BrandMark size={84} tone="ivory" />
        </View>

        {/* ── Member + ring ──────────────────────────────────────────────── */}
        <View style={styles.body}>
          <View style={styles.identity}>
            <Text style={styles.memberName} numberOfLines={1}>
              {memberName}
            </Text>
            <Text style={styles.tier}>Rewards Member</Text>
          </View>

          <View style={styles.ringWrap}>
            <Svg width={RING} height={RING}>
              <Defs>
                <SvgLG id="ringGold" x1="0" y1="0" x2="1" y2="1">
                  <Stop offset="0" stopColor={palette.goldLight} />
                  <Stop offset="1" stopColor={palette.gold} />
                </SvgLG>
              </Defs>
              <Circle
                cx={RING / 2}
                cy={RING / 2}
                r={R}
                stroke="rgba(245,239,226,0.14)"
                strokeWidth={STROKE}
                fill="none"
              />
              <AnimatedCircle
                cx={RING / 2}
                cy={RING / 2}
                r={R}
                stroke="url(#ringGold)"
                strokeWidth={STROKE}
                strokeLinecap="round"
                fill="none"
                strokeDasharray={CIRC}
                animatedProps={ringProps}
                transform={`rotate(-90 ${RING / 2} ${RING / 2})`}
              />
            </Svg>
            <View style={styles.ringCenter}>
              <Text style={styles.ringValue}>
                {visits}/{goal}
              </Text>
              <Text style={styles.ringLabel}>VISITS</Text>
            </View>
          </View>
        </View>

        <View style={styles.divider} />

        {/* ── Next reward ────────────────────────────────────────────────── */}
        <PressableScale
          onPress={onPressReward}
          disabled={!onPressReward}
          style={styles.rewardRow}
          accessibilityRole="button"
          accessibilityLabel={`Next reward: ${nextRewardName || "keep dining with us"}`}
          testID="card-next-reward"
        >
          <Ionicons name="wine-outline" size={22} color={palette.gold} />
          <View style={{ flex: 1 }}>
            <Text style={styles.rewardLabel}>Next reward</Text>
            {/* Two lines, not one: truncating the reward name hides the thing the
                member is working toward, which costs more than a card whose
                height varies slightly by reward. */}
            <Text style={styles.rewardName} numberOfLines={2}>
              {nextRewardName || "Keep dining with us"}
            </Text>
          </View>
          {onPressReward ? (
            <Ionicons name="chevron-forward" size={18} color="rgba(245,239,226,0.55)" />
          ) : null}
        </PressableScale>
      </View>

      {/* ── Footer bar ───────────────────────────────────────────────────── */}
      <View style={styles.footer}>
        <Text style={styles.footerLabel}>VISITS REMAINING</Text>
        <Text style={styles.footerValue}>{remaining}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: radii.xxl,
    overflow: "hidden",
    backgroundColor: "#0C3623",
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: palette.borderGold,
  },
  frame: {
    position: "absolute",
    top: 9,
    left: 9,
    right: 9,
    bottom: 9,
    borderRadius: radii.xl,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "rgba(201,169,97,0.24)",
  },
  inner: { paddingHorizontal: spacing.lg, paddingTop: spacing.lg, paddingBottom: spacing.md },

  // Crest
  crest: { alignItems: "center" },

  // Member + ring
  body: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: spacing.md,
    marginTop: spacing.lg,
  },
  identity: { flex: 1 },
  memberName: { ...type.h2, fontSize: 23, color: palette.ivory },
  tier: { ...type.bodySm, color: "rgba(201,169,97,0.85)", marginTop: 3 },

  ringWrap: { width: RING, height: RING, alignItems: "center", justifyContent: "center" },
  ringCenter: { position: "absolute", alignItems: "center" },
  ringValue: { ...type.numeral, fontSize: 21, lineHeight: 24, color: palette.ivory },
  ringLabel: { ...type.eyebrow, fontSize: 7.5, letterSpacing: 1.5, color: "rgba(201,169,97,0.9)" },

  divider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: "rgba(201,169,97,0.28)",
    marginTop: spacing.md,
  },

  // Next reward
  rewardRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    paddingVertical: spacing.md,
  },
  rewardLabel: { ...type.bodySm, fontSize: 12, color: "rgba(245,239,226,0.6)" },
  rewardName: { ...type.h3, fontSize: 16.5, color: palette.ivory, marginTop: 1 },

  // Footer
  footer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: spacing.lg,
    paddingVertical: 11,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: "rgba(201,169,97,0.24)",
    backgroundColor: "rgba(4,20,13,0.45)",
  },
  footerLabel: { ...type.eyebrow, fontSize: 9, letterSpacing: 1.8, color: "rgba(201,169,97,0.85)" },
  footerValue: { ...type.numeralSm, fontSize: 17, color: palette.ivory },
});
