// Member profile — standing, membership, and the account controls.

import { useCallback, useState } from "react";
import { Image, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useFocusEffect, useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import Animated, { FadeInDown, ReduceMotion } from "react-native-reanimated";

import { elevation, gradients, palette, radii, spacing, type } from "@/src/lib/theme";
import { useAuth } from "@/src/state/auth";
import { useRestaurant } from "@/src/state/restaurant";
import { api } from "@/src/lib/api";
import { Grain } from "@/src/components/ui/Grain";
import { PressableScale } from "@/src/components/ui/PressableScale";
import { Surface } from "@/src/components/ui/Surface";

const enter = (d: number) =>
  FadeInDown.delay(d).duration(420).reduceMotion(ReduceMotion.System);

export default function Profile() {
  const router = useRouter();
  const { user, signOut, refresh } = useAuth();
  const { loyalty, refresh: refreshLoyalty } = useRestaurant();
  const [redemptions, setRedemptions] = useState<any[]>([]);

  const load = useCallback(async () => {
    try {
      setRedemptions(await api.redemptions());
    } catch {}
  }, []);

  useFocusEffect(
    useCallback(() => {
      load();
      refresh();
      refreshLoyalty();
    }, [load, refresh, refreshLoyalty]),
  );

  if (!user) return null;

  return (
    <View style={styles.root}>
      {/* ── Hero ─────────────────────────────────────────────────────────── */}
      <View style={styles.hero}>
        <LinearGradient colors={gradients.walnut} style={StyleSheet.absoluteFill} />
        <Grain opacity={0.08} />
        <SafeAreaView edges={["top"]}>
          <View style={styles.heroRow}>
            <View style={{ flex: 1 }}>
              <Text style={styles.eyebrow}>MEMBER SINCE {memberYear(user.created_at)}</Text>
              <Text style={styles.name} numberOfLines={1}>
                {user.name}
              </Text>
              <Text style={styles.email} numberOfLines={1}>
                {user.email}
              </Text>
            </View>
            <View style={styles.avatar}>
              {user.picture ? (
                <Image source={{ uri: user.picture }} style={styles.avatarImg} />
              ) : (
                <Text style={styles.avatarText}>{user.name.charAt(0).toUpperCase()}</Text>
              )}
            </View>
          </View>
        </SafeAreaView>
      </View>

      <ScrollView contentContainerStyle={{ paddingBottom: 130 }} showsVerticalScrollIndicator={false}>
        {/* ── Standing ───────────────────────────────────────────────────── */}
        <Animated.View entering={enter(60)} style={styles.statsRow}>
          <Stat label="VISITS" value={loyalty?.visits ?? 0} />
          <Stat label="LIFETIME" value={loyalty?.lifetime_visits ?? 0} />
          <Stat label="REWARDS" value={redemptions.length} />
        </Animated.View>

        {/* ── Account ────────────────────────────────────────────────────── */}
        <Animated.View entering={enter(200)} style={styles.sectionWrap}>
          <Surface bezelPad={4} radius={radii.xl} depth="hairline">
            <Row
              icon="ribbon-outline"
              label="Rewards history"
              badge={redemptions.length ? String(redemptions.length) : undefined}
              onPress={() => router.push("/(tabs)/rewards")}
              testID="profile-history"
            />
            <Row icon="notifications-outline" label="Notifications" disabled testID="profile-notifications" />
            <Row icon="shield-checkmark-outline" label="Privacy & data" disabled last testID="profile-privacy" />
          </Surface>
        </Animated.View>

        <Animated.View entering={enter(260)}>
          <PressableScale style={styles.logout} onPress={signOut} testID="profile-logout">
            <Ionicons name="log-out-outline" size={17} color={palette.error} />
            <Text style={styles.logoutText}>Sign out</Text>
          </PressableScale>
        </Animated.View>

        <Text style={styles.version}>Clancy&apos;s · Cork · Made with ❦</Text>
      </ScrollView>
    </View>
  );
}

function memberYear(iso?: string) {
  const y = iso ? new Date(iso).getFullYear() : NaN;
  return Number.isFinite(y) ? y : new Date().getFullYear();
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <Surface style={{ flex: 1 }} radius={radii.lg} bezelPad={4} depth="hairline">
      <View style={styles.stat}>
        <Text style={styles.statValue}>{value}</Text>
        <Text style={styles.statLabel}>{label}</Text>
      </View>
    </Surface>
  );
}

function Row({
  icon,
  label,
  onPress,
  disabled,
  badge,
  last,
  testID,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  onPress?: () => void;
  disabled?: boolean;
  badge?: string;
  last?: boolean;
  testID?: string;
}) {
  return (
    <PressableScale
      onPress={onPress}
      disabled={disabled}
      testID={testID}
      accessibilityRole="button"
      accessibilityLabel={label}
      style={[styles.row, last && { borderBottomWidth: 0 }]}
    >
      <View style={styles.rowIcon}>
        <Ionicons name={icon} size={18} color={palette.emerald} />
      </View>
      <Text style={styles.rowLabel}>{label}</Text>
      {badge ? (
        <View style={styles.badge}>
          <Text style={styles.badgeText}>{badge}</Text>
        </View>
      ) : null}
      <Ionicons name="chevron-forward" size={17} color={palette.textMuted} />
    </PressableScale>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: palette.canvas },

  hero: { overflow: "hidden", borderBottomLeftRadius: radii.xxl, borderBottomRightRadius: radii.xxl },
  heroRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    padding: spacing.lg,
    paddingTop: spacing.sm,
  },
  eyebrow: { ...type.eyebrow, fontSize: 10, color: palette.gold },
  name: { ...type.h1, color: palette.ivory, marginTop: 5 },
  email: { ...type.bodySm, color: palette.textOnDarkMuted, marginTop: 2 },
  avatar: {
    width: 62,
    height: 62,
    borderRadius: 31,
    backgroundColor: "rgba(11,8,5,0.5)",
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: palette.borderGold,
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  avatarImg: { width: 62, height: 62 },
  avatarText: { ...type.h2, color: palette.ivory },

  statsRow: { flexDirection: "row", gap: spacing.sm, paddingHorizontal: spacing.lg, marginTop: spacing.lg },
  stat: { alignItems: "center", paddingVertical: spacing.md },
  statValue: { ...type.numeral, fontSize: 30, color: palette.textPrimary },
  statLabel: { ...type.eyebrow, fontSize: 9.5, letterSpacing: 1.6, color: palette.goldOnLight, marginTop: 3 },


  sectionWrap: { paddingHorizontal: spacing.lg, marginTop: spacing.lg },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    paddingHorizontal: spacing.md,
    paddingVertical: 15,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: palette.border,
  },
  rowIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "rgba(14,92,58,0.10)",
    alignItems: "center",
    justifyContent: "center",
  },
  rowLabel: { ...type.bodyMedium, flex: 1, color: palette.textPrimary },
  badge: {
    minWidth: 22,
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: radii.full,
    backgroundColor: "rgba(134,108,47,0.14)",
    alignItems: "center",
  },
  badgeText: { ...type.mono, fontSize: 11, color: palette.goldOnLight },

  logout: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    marginTop: spacing.xl,
    marginHorizontal: spacing.lg,
    paddingVertical: 15,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "rgba(142,53,53,0.28)",
    borderRadius: radii.full,
    backgroundColor: palette.errorSurface,
  },
  logoutText: { ...type.button, color: palette.error },
  version: { ...type.bodySm, fontSize: 11.5, color: palette.textMuted, textAlign: "center", marginTop: spacing.lg },
});
