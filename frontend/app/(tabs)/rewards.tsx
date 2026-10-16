// Rewards — the visit-based catalogue and the redemption history.
//
// An unlocked reward has to feel different from a locked one at a glance, so it
// changes on three axes at once: a gold-ringed shell, a filled "Ready" pill, and
// the progress rail completing. One signal alone reads as decoration.

import { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Image,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useFocusEffect, useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import Animated, { FadeInDown, ReduceMotion } from "react-native-reanimated";

import { gradients, palette, radii, spacing, type } from "@/src/lib/theme";
import { api, imageUrl, type Redemption, type Reward } from "@/src/lib/api";
import { useRestaurant } from "@/src/state/restaurant";
import { Button } from "@/src/components/ui/Button";
import { Grain } from "@/src/components/ui/Grain";
import { PressableScale } from "@/src/components/ui/PressableScale";
import { Surface } from "@/src/components/ui/Surface";

const enter = (i: number) =>
  FadeInDown.delay(i * 60).duration(420).reduceMotion(ReduceMotion.System);

export default function Rewards() {
  const { loyalty, refresh } = useRestaurant();
  const router = useRouter();
  const [rewards, setRewards] = useState<Reward[]>([]);
  const [history, setHistory] = useState<Redemption[]>([]);
  const [tab, setTab] = useState<"available" | "history">("available");
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    try {
      const [r, h] = await Promise.all([api.rewards(), api.redemptions()]);
      setRewards(r);
      setHistory(h);
    } catch (e) {
      console.log(e);
    }
  }, []);

  useEffect(() => {
    (async () => {
      setLoading(true);
      await load();
      setLoading(false);
    })();
  }, [load]);
  useFocusEffect(
    useCallback(() => {
      load();
      refresh();
    }, [load, refresh]),
  );

  const onRefresh = async () => {
    setRefreshing(true);
    await Promise.all([load(), refresh()]);
    setRefreshing(false);
  };

  const visits = loyalty?.visits || 0;

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color={palette.gold} />
      </View>
    );
  }

  return (
    <View style={styles.root}>
      {/* ── Hero ─────────────────────────────────────────────────────────── */}
      <View style={styles.hero}>
        <LinearGradient colors={gradients.walnut} style={StyleSheet.absoluteFill} />
        <Grain opacity={0.08} />
        <SafeAreaView edges={["top"]}>
          <View style={styles.heroContent}>
            <Text style={styles.eyebrow}>CLANCY&apos;S REWARDS</Text>
            <Text style={styles.title}>Your honoured seat</Text>

            <View style={styles.balance}>
              <View style={styles.balanceMain}>
                <Text style={styles.balanceValue} testID="rewards-visits-count">
                  {visits}
                </Text>
                <Text style={styles.balanceLabel}>
                  {visits === 1 ? "VISIT AVAILABLE" : "VISITS AVAILABLE"}
                </Text>
              </View>
              <View style={styles.balanceRule} />
              <View>
                <Text style={styles.lifetimeValue}>{loyalty?.lifetime_visits || 0}</Text>
                <Text style={styles.lifetimeLabel}>LIFETIME</Text>
              </View>
            </View>
          </View>
        </SafeAreaView>
      </View>

      {/* ── Tabs ─────────────────────────────────────────────────────────── */}
      <View style={styles.tabRow}>
        <TabBtn
          label="Available"
          count={rewards.length}
          active={tab === "available"}
          onPress={() => setTab("available")}
          testID="rewards-tab-available"
        />
        <TabBtn
          label="History"
          count={history.length}
          active={tab === "history"}
          onPress={() => setTab("history")}
          testID="rewards-tab-history"
        />
      </View>

      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={palette.gold} />
        }
      >
        {tab === "available" ? (
          rewards.length === 0 ? (
            <Empty icon="ribbon-outline" text="No rewards configured yet." />
          ) : (
            rewards.map((r, i) => {
              const unlocked = visits >= r.visits_required;
              const progress = Math.min(visits / r.visits_required, 1);
              return (
                <Animated.View key={r.reward_id} entering={enter(i)}>
                  <Surface
                    accent={unlocked}
                    depth={unlocked ? "card" : "hairline"}
                    radius={radii.xl}
                    style={styles.cardWrap}
                    testID={`reward-${r.reward_id}`}
                  >
                    <View style={styles.card}>
                      {r.image_url ? (
                        <Image source={{ uri: imageUrl(r.image_url) }} style={styles.cardImg} />
                      ) : (
                        <Medallion kind={r.reward_type} unlocked={unlocked} />
                      )}

                      <View style={{ flex: 1, gap: 5 }}>
                        <View style={styles.typePill}>
                          <Text style={styles.typeText}>{r.reward_type.toUpperCase()}</Text>
                        </View>

                        <Text style={styles.cardTitle}>{r.name}</Text>
                        <Text style={styles.cardDesc} numberOfLines={2}>
                          {r.description}
                        </Text>

                        <View style={styles.rail}>
                          <LinearGradient
                            colors={gradients.gold}
                            start={{ x: 0, y: 0 }}
                            end={{ x: 1, y: 0 }}
                            style={[styles.railFill, { width: `${progress * 100}%` }]}
                          />
                        </View>

                        <View style={styles.cardFooter}>
                          <Text style={styles.cardVisits}>
                            {Math.min(visits, r.visits_required)}/{r.visits_required} visits
                          </Text>
                          {unlocked ? (
                            <View style={styles.readyPill}>
                              <Ionicons name="checkmark-circle" size={12} color={palette.surfaceDarker} />
                              <Text style={styles.readyText}>READY</Text>
                            </View>
                          ) : r.value ? (
                            <Text style={styles.valueText}>{r.value}</Text>
                          ) : null}
                        </View>
                        {unlocked ? (
                          <Button
                            label="Redeem at the bar"
                            variant="gold"
                            onPress={() =>
                              router.push({
                                pathname: "/(tabs)/scan",
                                params: { purpose: "redeem", reward_id: r.reward_id, reward_name: r.name },
                              })
                            }
                            style={styles.redeemBtn}
                            testID={`redeem-${r.reward_id}`}
                          />
                        ) : null}
                      </View>
                    </View>
                  </Surface>
                </Animated.View>
              );
            })
          )
        ) : history.length === 0 ? (
          <Empty icon="time-outline" text="No rewards redeemed yet." />
        ) : (
          history.map((h, i) => (
            <Animated.View key={h.redemption_id} entering={enter(i)}>
              <Surface
                depth="hairline"
                radius={radii.lg}
                bezelPad={4}
                style={styles.cardWrap}
                testID={`history-${h.redemption_id}`}
              >
                <View style={styles.historyCard}>
                  <View style={styles.historyIcon}>
                    <Ionicons name="ribbon" size={18} color={palette.goldOnLight} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.historyName}>{h.reward_name}</Text>
                    <Text style={styles.historyDate}>
                      {new Date(h.redeemed_at).toLocaleDateString()} · {h.visits_spent}{" "}
                      {h.visits_spent === 1 ? "visit" : "visits"}
                    </Text>
                    {(h.status ?? "delivered") === "pending" ? (
                      <Text style={styles.historyPending} testID={`pending-${h.redemption_id}`}>
                        On its way · staff confirm when it reaches you
                      </Text>
                    ) : null}
                  </View>
                </View>
              </Surface>
            </Animated.View>
          ))
        )}
      </ScrollView>
    </View>
  );
}

// Stands in for photography. Each reward type gets its own mark, so the list
// still reads at a glance without a single stock photo — and an unlocked reward
// flips to solid gold, which is visible from across the room.
const REWARD_ICON: Record<string, keyof typeof Ionicons.glyphMap> = {
  dessert: "ice-cream-outline",
  drink: "wine-outline",
  tasting: "restaurant-outline",
  discount: "pricetag-outline",
  exclusive: "diamond-outline",
  birthday: "gift-outline",
};

function Medallion({ kind, unlocked }: { kind: string; unlocked: boolean }) {
  return (
    <View style={[styles.medallion, unlocked && styles.medallionUnlocked]}>
      <View style={[styles.medallionRing, unlocked && styles.medallionRingUnlocked]}>
        <Ionicons
          name={REWARD_ICON[kind] || "sparkles-outline"}
          size={26}
          color={unlocked ? palette.surfaceDarker : palette.goldOnLight}
        />
      </View>
    </View>
  );
}

function TabBtn({
  label,
  count,
  active,
  onPress,
  testID,
}: {
  label: string;
  count: number;
  active: boolean;
  onPress: () => void;
  testID?: string;
}) {
  return (
    <PressableScale
      style={[styles.tabBtn, active && styles.tabBtnActive]}
      onPress={onPress}
      testID={testID}
      accessibilityRole="tab"
      accessibilityState={{ selected: active }}
    >
      <Text style={[styles.tabText, active && styles.tabTextActive]}>{label}</Text>
      <View style={[styles.tabCount, active && styles.tabCountActive]}>
        <Text style={[styles.tabCountText, active && styles.tabCountTextActive]}>{count}</Text>
      </View>
    </PressableScale>
  );
}

function Empty({ icon, text }: { icon: keyof typeof Ionicons.glyphMap; text: string }) {
  return (
    <View style={styles.empty}>
      <Ionicons name={icon} size={34} color={palette.textMuted} />
      <Text style={styles.emptyText}>{text}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: palette.canvas },
  center: { flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: palette.canvas },

  hero: { overflow: "hidden", borderBottomLeftRadius: radii.xxl, borderBottomRightRadius: radii.xxl },
  heroContent: { padding: spacing.lg, paddingTop: spacing.sm, paddingBottom: spacing.lg },
  eyebrow: { ...type.eyebrow, color: palette.gold },
  title: { ...type.h1, color: palette.ivory, marginTop: 6 },

  balance: {
    marginTop: spacing.lg,
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.lg,
    backgroundColor: "rgba(245,239,226,0.07)",
    borderRadius: radii.lg,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: palette.borderGold,
  },
  balanceMain: { flex: 1 },
  balanceValue: { ...type.numeral, fontSize: 38, lineHeight: 42, color: palette.ivory },
  balanceLabel: { ...type.eyebrow, fontSize: 9.5, letterSpacing: 1.8, color: palette.gold, marginTop: 2 },
  balanceRule: { width: StyleSheet.hairlineWidth, alignSelf: "stretch", backgroundColor: palette.borderGold },
  lifetimeValue: { ...type.numeralSm, color: palette.textOnDark, textAlign: "right" },
  lifetimeLabel: { ...type.eyebrow, fontSize: 9, letterSpacing: 1.6, color: palette.textOnDarkMuted, marginTop: 2 },

  tabRow: { flexDirection: "row", paddingHorizontal: spacing.lg, marginTop: spacing.lg, gap: spacing.sm },
  tabBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 7,
    paddingVertical: 12,
    borderRadius: radii.full,
    backgroundColor: palette.surfaceMuted,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: palette.border,
  },
  tabBtnActive: { backgroundColor: palette.surfaceDarker, borderColor: palette.surfaceDarker },
  tabText: { ...type.buttonSm, color: palette.textSecondary },
  tabTextActive: { color: palette.ivory },
  tabCount: {
    minWidth: 20,
    paddingHorizontal: 5,
    paddingVertical: 1,
    borderRadius: radii.full,
    backgroundColor: "rgba(27,19,12,0.08)",
    alignItems: "center",
  },
  tabCountActive: { backgroundColor: "rgba(201,169,97,0.22)" },
  tabCountText: { ...type.mono, fontSize: 11, color: palette.textSecondary },
  tabCountTextActive: { color: palette.goldLight },

  scroll: { paddingTop: spacing.md, paddingBottom: 130 },
  cardWrap: { marginHorizontal: spacing.lg, marginBottom: spacing.sm + 2 },
  card: { flexDirection: "row", gap: spacing.md, padding: spacing.sm + 2 },
  cardImg: { width: 88, height: 88, borderRadius: radii.md },
  medallion: {
    width: 88,
    height: 88,
    borderRadius: radii.md,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(134,108,47,0.07)",
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "rgba(134,108,47,0.22)",
  },
  medallionUnlocked: { backgroundColor: "rgba(201,169,97,0.16)", borderColor: palette.gold },
  medallionRing: {
    width: 54,
    height: 54,
    borderRadius: 27,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "rgba(134,108,47,0.35)",
  },
  medallionRingUnlocked: { backgroundColor: palette.gold, borderColor: palette.gold },
  typePill: {
    alignSelf: "flex-start",
    backgroundColor: "rgba(14,92,58,0.10)",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: radii.full,
  },
  typeText: { ...type.eyebrow, fontSize: 8.5, letterSpacing: 1.2, color: palette.emerald },
  cardTitle: { ...type.h3, fontSize: 16.5, color: palette.textPrimary },
  cardDesc: { ...type.bodySm, fontSize: 12.5, color: palette.textSecondary },

  rail: { height: 5, backgroundColor: "rgba(27,19,12,0.09)", borderRadius: 3, overflow: "hidden", marginTop: 5 },
  railFill: { height: "100%", borderRadius: 3 },

  cardFooter: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginTop: 5 },
  redeemBtn: { marginTop: spacing.sm },
  cardVisits: { ...type.mono, fontSize: 11.5, color: palette.goldOnLight },
  readyPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: palette.gold,
    paddingHorizontal: 9,
    paddingVertical: 3,
    borderRadius: radii.full,
  },
  readyText: { ...type.eyebrow, fontSize: 9, letterSpacing: 1.1, color: palette.surfaceDarker },
  valueText: { ...type.label, fontSize: 11, letterSpacing: 0.3, color: palette.textMuted },

  historyCard: { flexDirection: "row", gap: spacing.md, alignItems: "center", padding: spacing.md },
  historyIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(134,108,47,0.12)",
    alignItems: "center",
    justifyContent: "center",
  },
  historyName: { ...type.h3, fontSize: 15.5, color: palette.textPrimary },
  historyDate: { ...type.bodySm, fontSize: 12.5, color: palette.textMuted, marginTop: 2 },
  historyPending: { ...type.bodySm, color: palette.goldOnLight, marginTop: 3 },

  empty: { alignItems: "center", gap: spacing.sm, paddingVertical: spacing.xxl },
  emptyText: { ...type.body, color: palette.textMuted },
});
