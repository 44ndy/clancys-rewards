// Customer Home — the membership pass, progress, the two actions, then what's on
// and the house details.
//
// Motion budget for this screen, decided before any of it was written:
//   · ONE orchestrated entrance on mount (pass → progress → actions → the rest),
//     staggered 70ms. Occasional tier, purpose: orchestration.
//   · Press feedback on every row: scale 0.97 in 120ms. 100+/day tier, so it has
//     to stay near-imperceptible — that's the ceiling, not a starting point.
//   · The ring sweep and the dot stagger live in their own components.
//   · Refresh spins its icon only while the request is actually in flight.
//
// Deliberately NOT animated: the card has no shimmer or glow loop, the current
// progress dot doesn't pulse (colour already distinguishes it — motion would be
// decoration), and nothing is tied to scroll position. Cut motion before adding it.

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Image,
  Platform,
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
import * as Haptics from "expo-haptics";

import { elevation, gradients, palette, radii, spacing, type } from "@/src/lib/theme";
import { api, imageUrl, type Promotion } from "@/src/lib/api";
import { useAuth } from "@/src/state/auth";
import { useRestaurant } from "@/src/state/restaurant";
import { LoyaltyCard } from "@/src/components/LoyaltyCard";
import { ProgressTrack } from "@/src/components/ProgressTrack";
import { ActionRow } from "@/src/components/ui/ActionRow";
import { Grain } from "@/src/components/ui/Grain";
import { PressableScale } from "@/src/components/ui/PressableScale";
import { Surface } from "@/src/components/ui/Surface";

/** One orchestrated entrance. Memoised per delay so the builder isn't rebuilt on
 *  every render — an inline chain in JSX rebuilds it each time. */
function useEnter(delay: number) {
  return useMemo(
    () => FadeInDown.duration(420).delay(delay).reduceMotion(ReduceMotion.System),
    [delay],
  );
}

export default function Home() {
  const router = useRouter();
  const { user } = useAuth();
  const { restaurant, loyalty, loading, refresh } = useRestaurant();
  const [promos, setPromos] = useState<Promotion[]>([]);
  const [refreshing, setRefreshing] = useState(false);

  const loadPromos = useCallback(async () => {
    try {
      setPromos(await api.promotions());
    } catch (e) {
      console.log("promos", e);
    }
  }, []);

  useEffect(() => {
    loadPromos();
  }, [loadPromos]);
  useFocusEffect(
    useCallback(() => {
      refresh();
      loadPromos();
    }, [refresh, loadPromos]),
  );

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await Promise.all([refresh(), loadPromos()]);
    setRefreshing(false);
  }, [refresh, loadPromos]);

  // One haptic, on the commit — paired with the icon spin, never the only signal.
  //
  // The floor matters: on a fast connection this request lands in ~50ms, and a
  // spinner that appears and vanishes inside 50ms reads as a glitch, not as
  // feedback ("spinners that flash"). Holding the spin for at least 600ms makes
  // the tap feel acknowledged instead of ignored.
  const onRefreshCard = useCallback(async () => {
    if (Platform.OS !== "web") Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setRefreshing(true);
    const [result] = await Promise.allSettled([
      Promise.all([refresh(), loadPromos()]),
      new Promise((r) => setTimeout(r, 600)),
    ]);
    if (result.status === "rejected") console.log("refresh failed", result.reason);
    setRefreshing(false);
  }, [refresh, loadPromos]);

  const enterCard = useEnter(0);
  const enterProgress = useEnter(70);
  const enterActions = useEnter(140);
  const enterHint = useEnter(210);
  const enterPromos = useEnter(280);
  const enterHouse = useEnter(420);

  if (loading || !restaurant) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color={palette.gold} />
      </View>
    );
  }

  const visits = loyalty?.visits || 0;
  const goal = loyalty?.next_reward?.visits_required || 5;
  const firstName = (user?.name || "Guest").split(" ")[0];

  return (
    <View style={styles.root}>
      <ScrollView
        contentContainerStyle={{ paddingBottom: 130 }}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={palette.gold} />
        }
      >
        <SafeAreaView edges={["top"]}>
          {/* ── Greeting ─────────────────────────────────────────────────── */}
          <View style={styles.greetRow}>
            <View style={{ flex: 1 }}>
              <Text style={styles.greetEyebrow}>WELCOME BACK</Text>
              <Text style={styles.greetName} numberOfLines={1}>
                {firstName}
              </Text>
            </View>
            <PressableScale
              onPress={() => router.push("/(tabs)/profile")}
              style={styles.avatar}
              testID="home-avatar"
              accessibilityLabel="Your profile"
            >
              <Text style={styles.avatarText}>
                {(user?.name || "?").charAt(0).toUpperCase()}
              </Text>
            </PressableScale>
          </View>

          {/* ── Membership pass ──────────────────────────────────────────── */}
          <Animated.View entering={enterCard} style={styles.pad}>
            <LoyaltyCard
              visits={visits}
              goal={goal}
              memberName={user?.name || "Guest"}
              nextRewardName={loyalty?.next_reward?.name}
              onPressReward={() => router.push("/(tabs)/rewards")}
            />
          </Animated.View>

          {/* ── Progress ─────────────────────────────────────────────────── */}
          {/* Only worth showing from three steps up. Every new member starts on a
              1-visit reward, and a track with a single dot says nothing the ring
              above hasn't already said — it just looks unfinished. */}
          {goal >= 3 && (
            <Animated.View entering={enterProgress} style={[styles.pad, styles.gapMd]}>
              <ProgressTrack visits={visits} goal={goal} />
            </Animated.View>
          )}

          {/* ── Actions ──────────────────────────────────────────────────── */}
          <Animated.View entering={enterActions} style={[styles.pad, styles.gapMd, styles.actions]}>
            <ActionRow
              icon="qr-code"
              label="Show QR Pass"
              onPress={() => router.push("/(tabs)/scan")}
              tone="solid"
              testID="qa-qr"
            />
            <ActionRow
              icon="refresh"
              label="Refresh Card"
              onPress={onRefreshCard}
              tone="outline"
              spinning={refreshing}
              testID="qa-refresh"
            />
          </Animated.View>

          <Animated.View entering={enterHint} style={styles.hint}>
            <Ionicons name="time-outline" size={13} color={palette.textMuted} />
            <Text style={styles.hintText}>QR passes expire 3 minutes after you open them</Text>
          </Animated.View>
        </SafeAreaView>

        {/* ── What's on ────────────────────────────────────────────────── */}
        {promos.length > 0 && (
          <Animated.View entering={enterPromos} style={styles.section}>
            <Text style={[styles.sectionTitle, styles.pad]}>What&apos;s on</Text>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.promoScroll}
              decelerationRate="fast"
              snapToInterval={296}
            >
              {promos.map((p) => (
                <PressableScale
                  key={p.promotion_id}
                  style={[styles.promoCard, elevation.card]}
                  testID={`promo-${p.promotion_id}`}
                  accessibilityLabel={p.title}
                >
                  {p.image_url ? (
                    <Image source={{ uri: imageUrl(p.image_url) }} style={styles.promoImg} />
                  ) : (
                    <View style={[styles.promoImg, { backgroundColor: p.banner_color }]} />
                  )}
                  <LinearGradient
                    colors={gradients.photoScrim}
                    locations={[0, 0.42, 0.9]}
                    style={StyleSheet.absoluteFill}
                  />
                  <Grain opacity={0.05} />
                  <View style={styles.promoText}>
                    <Text style={styles.promoTitle} numberOfLines={1}>
                      {p.title}
                    </Text>
                    <Text style={styles.promoDesc} numberOfLines={2}>
                      {p.description}
                    </Text>
                  </View>
                </PressableScale>
              ))}
            </ScrollView>
          </Animated.View>
        )}

        {/* ── The house ─────        {/* ── The house ────────────────────────────────────────────────── */}
        <Animated.View entering={enterHouse} style={styles.infoWrap}>
          <Text style={styles.sectionTitle}>The house</Text>
          <Surface style={{ marginTop: spacing.md }} testID="restaurant-info">
            <View style={styles.infoInner}>
              <Text style={styles.infoBody}>{restaurant.description}</Text>
              <View style={styles.infoDivider} />
              <InfoRow icon="location-outline" text={restaurant.address} />
              <InfoRow icon="call-outline" text={restaurant.phone} />
              <InfoRow icon="time-outline" text={restaurant.hours} />
              {restaurant.instagram ? (
                <InfoRow icon="logo-instagram" text={restaurant.instagram} last />
              ) : null}
            </View>
          </Surface>
        </Animated.View>
      </ScrollView>
    </View>
  );
}

function InfoRow({
  icon,
  text,
  last,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  text: string;
  last?: boolean;
}) {
  return (
    <View style={[styles.infoRow, last && { borderBottomWidth: 0, marginBottom: 0 }]}>
      <Ionicons name={icon} size={15} color={palette.goldOnLight} />
      <Text style={styles.infoText}>{text}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: palette.canvas },
  center: { flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: palette.canvas },

  pad: { paddingHorizontal: spacing.lg },
  gapMd: { marginTop: spacing.md },

  // Greeting
  greetRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.sm,
    paddingBottom: spacing.md,
  },
  greetEyebrow: { ...type.eyebrow, fontSize: 10, color: palette.goldOnLight },
  greetName: { ...type.h1, fontSize: 28, color: palette.textPrimary, marginTop: 3 },
  avatar: {
    width: 46,
    height: 46,
    borderRadius: 23,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: palette.borderGold,
    backgroundColor: palette.surfaceMuted,
    alignItems: "center",
    justifyContent: "center",
  },
  avatarText: { ...type.h3, fontSize: 17, color: palette.textPrimary },

  actions: { gap: spacing.sm + 2 },

  hint: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    marginTop: spacing.md,
    paddingHorizontal: spacing.lg,
  },
  hintText: { ...type.bodySm, fontSize: 11.5, color: palette.textMuted },

  // Sections
  section: { marginTop: spacing.xxl },
  sectionTitle: { ...type.h1, color: palette.textPrimary },

  promoScroll: { paddingHorizontal: spacing.lg, paddingTop: spacing.md, gap: 16, paddingBottom: 4 },
  promoCard: {
    width: 280,
    height: 208,
    borderRadius: radii.xl,
    overflow: "hidden",
    backgroundColor: palette.surfaceDarker,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: palette.borderGold,
  },
  promoImg: { ...StyleSheet.absoluteFillObject, width: "100%", height: "100%" },
  promoText: { position: "absolute", bottom: 16, left: 16, right: 16 },
  promoTitle: { ...type.h3, fontSize: 19, color: palette.ivory },
  promoDesc: { ...type.bodySm, fontSize: 12.5, lineHeight: 18, color: palette.textOnDarkMuted, marginTop: 3 },

  // Reserve

  // House info
  infoWrap: { marginTop: spacing.xxl, paddingHorizontal: spacing.lg },
  infoInner: { padding: spacing.lg },
  infoBody: { ...type.quote, color: palette.textSecondary },
  infoDivider: { height: StyleSheet.hairlineWidth, backgroundColor: palette.border, marginVertical: spacing.md },
  infoRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 11,
    paddingBottom: 11,
    marginBottom: 11,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: palette.border,
  },
  infoText: { ...type.bodySm, color: palette.textPrimary, flex: 1 },
});
