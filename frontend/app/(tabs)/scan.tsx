// My QR — the customer's one-time visit pass.
//
// This screen is used in a dark pub, at arm's length, by someone who wants it over
// with. So: maximum quiet, the code on the brightest possible white (scanners need
// the contrast), a countdown that is legible without being anxious, and a single
// obvious action when it lapses.

import { useCallback, useEffect, useRef, useState } from "react";
import { ActivityIndicator, Platform, Pressable, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useLocalSearchParams } from "expo-router";
import QRCode from "react-native-qrcode-svg";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import * as Haptics from "expo-haptics";

import { elevation, gradients, palette, radii, spacing, type } from "@/src/lib/theme";
import { api, type ScanResult } from "@/src/lib/api";
import { useRestaurant } from "@/src/state/restaurant";
import { Button } from "@/src/components/ui/Button";
import { Grain } from "@/src/components/ui/Grain";

export default function Scan() {
  const { restaurant, refresh: refreshLoyalty } = useRestaurant();
  // Rewards sends us here with purpose=redeem; the bar screen is the same pass.
  const params = useLocalSearchParams<{ purpose?: string; reward_id?: string; reward_name?: string }>();
  const purpose: "visit" | "redeem" = params.purpose === "redeem" ? "redeem" : "visit";
  const [token, setToken] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  // Set the moment staff read the code: the guest watches this flip without touching anything.
  const [counted, setCounted] = useState<ScanResult | null>(null);
  const [delivered, setDelivered] = useState(false);
  const [expiresIn, setExpiresIn] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const generate = useCallback(async () => {
    setError(null);
    setLoading(true);
    setCounted(null);
    setDelivered(false);
    try {
      const r = await api.generateQR(purpose, params.reward_id);
      setToken(r.token);
      const ms = new Date(r.expires_at).getTime() - Date.now();
      setExpiresIn(Math.max(Math.floor(ms / 1000), 0));
      // One haptic, on the commit — the code is ready to show.
      if (Platform.OS !== "web") {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      }
    } catch (e: any) {
      setError(e.message || "Couldn't reach Clancy's. Check your connection.");
    } finally {
      setLoading(false);
    }
  }, [purpose, params.reward_id]);

  useEffect(() => {
    generate();
  }, [generate]);

  // Ask every two seconds whether the code has been read. Cheap, and it is the
  // whole point: the guest sees the visit land without pulling to refresh.
  // Depends on `active`, not on the countdown itself: re-running this every
  // second would reset the interval before it ever fired.
  const active = expiresIn > 0;
  useEffect(() => {
    if (!token || counted || !active) return;
    const id = setInterval(async () => {
      try {
        const st = await api.qrStatus(token);
        if (st.used && st.result) {
          setCounted(st.result);
          refreshLoyalty();
          if (Platform.OS !== "web") Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        }
      } catch {
        /* the next tick will try again */
      }
    }, 2000);
    return () => clearInterval(id);
  }, [token, counted, active, refreshLoyalty]);

  // A reserved reward becomes real when staff tap Delivered; keep watching for it.
  useEffect(() => {
    if (!counted || counted.kind !== "redeem" || delivered) return;
    const rid = counted.redemption_id;
    const id = setInterval(async () => {
      try {
        const list = await api.redemptions();
        if (list.find((r) => r.redemption_id === rid)?.status === "delivered") {
          setDelivered(true);
          if (Platform.OS !== "web") Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        }
      } catch {
        /* keep watching */
      }
    }, 3000);
    return () => clearInterval(id);
  }, [counted, delivered]);

  useEffect(() => {
    if (intervalRef.current) clearInterval(intervalRef.current);
    if (expiresIn <= 0) return;
    intervalRef.current = setInterval(() => {
      setExpiresIn((s) => {
        if (s <= 1) {
          if (intervalRef.current) clearInterval(intervalRef.current);
          return 0;
        }
        return s - 1;
      });
    }, 1000);
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [expiresIn]);

  const live = expiresIn > 0 && !!token && !loading && !counted;
  const rewardName = typeof params.reward_name === "string" ? params.reward_name : "your reward";
  const mm = Math.floor(expiresIn / 60);
  const ss = String(expiresIn % 60).padStart(2, "0");

  return (
    <View style={styles.root}>
      <LinearGradient colors={gradients.walnut} style={StyleSheet.absoluteFill} />
      <Grain opacity={0.09} />

      <SafeAreaView edges={["top"]} style={{ flex: 1 }}>
        <View style={styles.header}>
          <Text style={styles.eyebrow}>{purpose === "redeem" ? "YOUR REWARD" : "YOUR PASS"}</Text>
          <Text style={styles.title}>{purpose === "redeem" ? "Show this to redeem" : "Show this at the bar"}</Text>
          <Text style={styles.subtitle}>
            {purpose === "redeem"
              ? `Our staff will scan it and bring ${rewardName} to you.`
              : `Our staff at ${restaurant?.name || "Clancy's"} will scan it to mark your visit.`}
          </Text>
        </View>

        <View style={styles.stage}>
          {/* The pass itself — a bright plate in a gold-ruled tray. */}
          <View style={[styles.tray, live && elevation.glow]}>
            <View style={styles.plate}>
              {loading || !token ? (
                <View style={styles.qrBox}>
                  <ActivityIndicator color={palette.goldOnLight} />
                </View>
              ) : counted ? (
                <View style={styles.qrBox} testID="qr-counted">
                  <Ionicons name="checkmark-circle" size={52} color={palette.emerald} />
                  <Text style={styles.countedTitle}>
                    {counted.kind === "visit" ? "Visit counted" : delivered ? "Delivered" : "Reward reserved"}
                  </Text>
                  <Text style={styles.countedLine}>
                    {counted.kind === "visit"
                      ? `${counted.visits}${counted.goal ? ` of ${counted.goal}` : ""} visits`
                      : delivered
                        ? `Enjoy ${counted.reward}. Sláinte.`
                        : `${counted.reward} is on its way`}
                  </Text>
                  {counted.kind === "visit" && counted.unlocked.length > 0 ? (
                    <Text style={styles.countedReward}>
                      Reward unlocked · {counted.unlocked.map((u) => u.name).join(", ")}
                    </Text>
                  ) : null}
                </View>
              ) : live ? (
                <View style={styles.qrWrap}>
                  <QRCode
                    value={token}
                    size={216}
                    color={palette.surfaceDarker}
                    backgroundColor="#FFFFFF"
                  />
                  {/* The code as text, for the night the camera fails: staff can
                      key it in. Selectable so it can be copied, small so the QR
                      stays the thing you hold up. */}
                  <Text style={styles.tokenText} selectable numberOfLines={1} testID="qr-token-text">
                    {token}
                  </Text>
                  {/* Web only. On a phone the staff point a camera at this and
                      the text is just a fallback. In the browser build there is
                      no camera reader, so the code has to travel by clipboard —
                      and the text above is clipped to one line, which makes
                      selecting it by hand a fiddle. */}
                  {Platform.OS === "web" ? (
                    <Pressable
                      style={styles.copyBtn}
                      testID="qr-copy-code"
                      onPress={async () => {
                        try {
                          await navigator.clipboard.writeText(token);
                          setCopied(true);
                          setTimeout(() => setCopied(false), 1800);
                        } catch {
                          // Clipboard needs a secure context; on plain http it
                          // can refuse. The text above stays selectable.
                          setCopied(false);
                        }
                      }}
                    >
                      <Ionicons
                        name={copied ? "checkmark" : "copy-outline"}
                        size={13}
                        color={palette.textMuted}
                      />
                      <Text style={styles.copyText}>{copied ? "Copied" : "Copy code"}</Text>
                    </Pressable>
                  ) : null}
                </View>
              ) : (
                <View style={styles.qrBox}>
                  <Ionicons name="refresh-circle-outline" size={44} color={palette.textMuted} />
                  <Text style={styles.expiredText}>This code has expired</Text>
                </View>
              )}
            </View>

            <View style={styles.trayFooter}>
              <View style={styles.trayRule} />
              <Text style={styles.trayMark}>CLANCY&apos;S · EST. 1824</Text>
              <View style={styles.trayRule} />
            </View>
          </View>

          <View style={styles.timerRow} testID="qr-expiry">
            <View style={[styles.dot, { backgroundColor: live || counted ? palette.successOnDark : palette.textMuted }]} />
            <Text style={styles.timerText}>
              {counted ? "Scanned" : live ? `Valid for ${mm}:${ss}` : "Tap below for a fresh code"}
            </Text>
          </View>

          <Button
            label={live ? "Generate new code" : "Get a new code"}
            icon="refresh"
            variant={live ? "ghostDark" : "gold"}
            onPress={generate}
            loading={loading}
            style={styles.refresh}
            testID="qr-refresh"
          />

          {error ? <Text style={styles.error}>{error}</Text> : null}
        </View>

        <View style={styles.tip}>
          <Ionicons name="lock-closed-outline" size={13} color={palette.gold} />
          <Text style={styles.tipText}>One-time use · expires in 3 minutes</Text>
        </View>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: palette.background },

  header: { paddingHorizontal: spacing.lg, paddingTop: spacing.sm, alignItems: "center" },
  eyebrow: { ...type.eyebrow, color: palette.gold },
  title: { ...type.h1, color: palette.ivory, marginTop: 6, textAlign: "center" },
  subtitle: {
    ...type.quoteSm,
    color: palette.textOnDarkMuted,
    textAlign: "center",
    marginTop: 6,
    paddingHorizontal: spacing.md,
  },

  stage: { alignItems: "center", marginTop: spacing.xl, paddingHorizontal: spacing.lg },

  tray: {
    padding: spacing.md,
    borderRadius: radii.xxl,
    backgroundColor: "rgba(245,239,226,0.07)",
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: palette.borderGold,
  },
  plate: { backgroundColor: "#FFFFFF", padding: spacing.md + 2, borderRadius: radii.lg },
  qrBox: {
    width: 216,
    height: 216,
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.sm,
  },
  qrWrap: { alignItems: "center", gap: spacing.sm },
  tokenText: { ...type.mono, fontSize: 11, color: palette.textMuted, letterSpacing: 0.4, maxWidth: 216 },
  copyBtn: { flexDirection: "row", alignItems: "center", gap: 5, paddingVertical: 4, paddingHorizontal: 2 },
  copyText: { ...type.body, fontSize: 11, color: palette.textMuted, letterSpacing: 0.3 },
  countedTitle: { ...type.h2, color: palette.textPrimary, textAlign: "center" },
  countedLine: { ...type.body, color: palette.textSecondary, textAlign: "center" },
  countedReward: { ...type.strong, color: palette.goldOnLight, textAlign: "center", marginTop: 2 },
  expiredText: { ...type.bodySm, color: palette.textSecondary },

  trayFooter: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    marginTop: spacing.sm + 2,
    paddingHorizontal: 4,
  },
  trayRule: { flex: 1, height: StyleSheet.hairlineWidth, backgroundColor: palette.borderGold },
  trayMark: { ...type.eyebrow, fontSize: 8.5, letterSpacing: 2.4, color: palette.gold },

  timerRow: { flexDirection: "row", alignItems: "center", gap: 8, marginTop: spacing.lg },
  dot: { width: 7, height: 7, borderRadius: 4 },
  timerText: { ...type.mono, fontSize: 14, color: palette.goldLight, letterSpacing: 0.6 },

  refresh: { alignSelf: "stretch", marginTop: spacing.md },
  error: { ...type.bodySm, color: palette.errorOnDark, marginTop: spacing.md, textAlign: "center" },

  tip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 7,
    alignSelf: "center",
    marginTop: "auto",
    marginBottom: 110,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: radii.full,
    backgroundColor: "rgba(245,239,226,0.06)",
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: palette.borderDark,
  },
  tipText: { ...type.bodySm, fontSize: 11.5, color: palette.textOnDarkMuted },
});
