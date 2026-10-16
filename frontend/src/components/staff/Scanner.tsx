// The staff scanner — the floor's whole app.
//
// A waiter uses this standing, one-handed, in a dim and loud room, in the ten
// seconds after taking payment while the guest holds up a code. So the camera
// is the screen: nothing to find, nothing to tap, point and it reads. The
// outcome then floods the whole display, because a result the waiter has to
// squint at is a result they will scan twice.
//
// Three outcomes, three floods:
//   · visit counted  — emerald, the guest's name, where they now stand
//   · reward         — gold; a redemption stays up until the waiter taps
//                      "Delivered", because the house counts the hand-over,
//                      not the scan (two steps, by the owner's rule)
//   · refused        — walnut, the reason in plain words, a way to retry
//
// The camera barcode reader is native-only. On the web build the manual code
// field opens by default and says so; it never pretends a camera exists.
// Under Reduce Motion the floods cut in and out instead of fading; the
// information is the same either way.

import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import { Platform, Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { CameraView, useCameraPermissions, type BarcodeScanningResult } from "expo-camera";
import Animated, { FadeIn, FadeOut, ReduceMotion } from "react-native-reanimated";
import * as Haptics from "expo-haptics";
import { Ionicons } from "@expo/vector-icons";

import { palette, radii, spacing, type } from "@/src/lib/theme";
import { api, type ScanResult } from "@/src/lib/api";
import { useAuth } from "@/src/state/auth";
import { BrandMark } from "@/src/components/brand/BrandMark";
import { Button } from "@/src/components/ui/Button";
import { Grain } from "@/src/components/ui/Grain";

type Outcome = ScanResult | { kind: "error"; message: string };
type TrailEntry = { id: string; label: string; at: number };

const CAMERA_READS = Platform.OS !== "web";
const AUTO_DISMISS_MS = 3000;

// The backend speaks in codes; the waiter needs the problem and the recovery.
function plain(message?: string): string {
  const m = (message || "").toLowerCase();
  if (m.includes("expired")) return "That code has expired. Ask the guest for a fresh one.";
  if (m.includes("already used")) return "That code was already scanned.";
  if (m.includes("invalid")) return "That isn't a Clancy's code.";
  if (m.includes("not enough")) return "Not enough visits yet for that reward.";
  if (m.includes("staff only") || m.includes("403")) return "Your account can't scan. Ask the manager.";
  return "Couldn't reach Clancy's. Try again.";
}

function describe(r: ScanResult): string {
  if (r.kind === "redeem") return `${r.customer.name} · ${r.reward}`;
  return `${r.customer.name} · visit ${r.visits}${r.goal ? ` of ${r.goal}` : ""}`;
}

function ago(at: number, now: number): string {
  const s = Math.max(0, Math.round((now - at) / 1000));
  return s < 5 ? "just now" : s < 60 ? `${s}s ago` : `${Math.floor(s / 60)}m ago`;
}

const haptic = (kind: "success" | "error") => {
  if (Platform.OS === "web") return;
  Haptics.notificationAsync(
    kind === "success" ? Haptics.NotificationFeedbackType.Success : Haptics.NotificationFeedbackType.Error,
  );
};

export function Scanner() {
  const { user, signOut } = useAuth();
  const [permission, requestPermission] = useCameraPermissions();
  const [outcome, setOutcome] = useState<Outcome | null>(null);
  const [busy, setBusy] = useState(false);
  const [delivering, setDelivering] = useState(false);
  const [manualOpen, setManualOpen] = useState(!CAMERA_READS);
  const [code, setCode] = useState("");
  const [trail, setTrail] = useState<TrailEntry[]>([]);
  const [now, setNow] = useState(Date.now());
  // The camera fires several frames for one code; the first one wins and the
  // rest are ignored until the flood is dismissed.
  const lock = useRef(false);
  const dismissTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const cameraLive = CAMERA_READS && !!permission?.granted;
  const firstName = (user?.name || "").trim().split(/\s+/)[0] || "there";

  const dismiss = useCallback(() => {
    if (dismissTimer.current) clearTimeout(dismissTimer.current);
    dismissTimer.current = null;
    setOutcome(null);
    lock.current = false;
  }, []);

  const submit = useCallback(async (raw: string) => {
    const token = raw.trim();
    if (lock.current || !token) return;
    lock.current = true;
    setBusy(true);
    try {
      const r = await api.scanQR(token);
      setOutcome(r);
      setCode("");
      setTrail((t) => [{ id: `${Date.now()}`, label: describe(r), at: Date.now() }, ...t].slice(0, 3));
      haptic("success");
    } catch (e: any) {
      setOutcome({ kind: "error", message: plain(e?.message) });
      haptic("error");
    } finally {
      setBusy(false);
    }
  }, []);

  const deliver = useCallback(async () => {
    if (!outcome || outcome.kind !== "redeem" || outcome.status === "delivered") return;
    setDelivering(true);
    try {
      await api.deliverRedemption(outcome.redemption_id);
      setOutcome({ ...outcome, status: "delivered" });
      haptic("success");
    } catch (e: any) {
      setOutcome({ kind: "error", message: plain(e?.message) });
      haptic("error");
    } finally {
      setDelivering(false);
    }
  }, [outcome]);

  // A pending redemption waits for the hand-over; everything else clears itself.
  const holds = !!outcome && outcome.kind === "redeem" && outcome.status === "pending";
  useEffect(() => {
    if (!outcome || holds) return;
    dismissTimer.current = setTimeout(dismiss, AUTO_DISMISS_MS);
    return () => {
      if (dismissTimer.current) clearTimeout(dismissTimer.current);
    };
  }, [outcome, holds, dismiss]);

  // Relative times in the trail only need to be roughly right.
  useEffect(() => {
    if (trail.length === 0) return;
    const id = setInterval(() => setNow(Date.now()), 5000);
    return () => clearInterval(id);
  }, [trail.length]);

  const onScan = useCallback((r: BarcodeScanningResult) => submit(r.data), [submit]);

  return (
    <View style={styles.root}>
      {cameraLive ? (
        <CameraView
          style={StyleSheet.absoluteFill}
          facing="back"
          barcodeScannerSettings={{ barcodeTypes: ["qr"] }}
          onBarcodeScanned={outcome || busy ? undefined : onScan}
        />
      ) : null}
      <Grain opacity={0.06} />

      <SafeAreaView style={styles.safe} edges={["top", "bottom"]}>
        {/* ── Who's holding the phone ────────────────────────────────────── */}
        <View style={styles.header}>
          <BrandMark size={30} tone="gold" />
          <Text style={styles.shift} numberOfLines={1}>
            On shift · {firstName}
          </Text>
          <Pressable
            onPress={signOut}
            hitSlop={8}
            style={styles.signOut}
            accessibilityRole="button"
            accessibilityLabel="Sign out"
            testID="staff-sign-out"
          >
            <Ionicons name="log-out-outline" size={22} color={palette.textOnDarkMuted} />
          </Pressable>
        </View>

        {/* ── The stage: viewfinder, or the reason there isn't one ───────── */}
        <View style={styles.stage}>
          {cameraLive ? (
            <>
              <View style={styles.finder} accessibilityLabel="Camera viewfinder">
                <View style={[styles.corner, styles.tl]} />
                <View style={[styles.corner, styles.tr]} />
                <View style={[styles.corner, styles.bl]} />
                <View style={[styles.corner, styles.br]} />
              </View>
              <Text style={styles.caption}>{busy ? "Reading…" : "Point at the guest's code"}</Text>
            </>
          ) : CAMERA_READS ? (
            <View style={styles.ask}>
              <Ionicons name="camera-outline" size={40} color={palette.gold} />
              <Text style={styles.askTitle}>The scanner needs the camera</Text>
              <Text style={styles.askBody}>
                {permission && !permission.canAskAgain
                  ? "Camera access is off for Clancy's. Turn it on in Settings, then come back."
                  : "It reads the guest's code the moment it's in frame. Nothing is recorded."}
              </Text>
              {permission?.canAskAgain !== false ? (
                <Button label="Allow camera" variant="gold" onPress={requestPermission} style={styles.askBtn} />
              ) : null}
            </View>
          ) : (
            <View style={styles.ask}>
              <Ionicons name="phone-portrait-outline" size={40} color={palette.gold} />
              <Text style={styles.askTitle}>Camera scanning runs on the phone</Text>
              <Text style={styles.askBody}>
                This is the web build. Paste the code from under the guest's QR below.
              </Text>
            </View>
          )}
        </View>

        {/* ── Recent scans: the answer to "did that go in?" ─────────────── */}
        {trail.length > 0 ? (
          <View style={styles.trail} accessibilityLabel="Recent scans">
            {trail.map((t) => (
              <View key={t.id} style={styles.trailRow}>
                <Ionicons name="checkmark" size={14} color={palette.successOnDark} />
                <Text style={styles.trailLabel} numberOfLines={1}>
                  {t.label}
                </Text>
                <Text style={styles.trailAgo}>{ago(t.at, now)}</Text>
              </View>
            ))}
          </View>
        ) : null}

        {/* ── Manual entry: the honest fallback ──────────────────────────── */}
        {manualOpen ? (
          <View style={styles.manual}>
            <TextInput
              style={styles.input}
              value={code}
              onChangeText={setCode}
              placeholder="Code from under the guest's QR"
              placeholderTextColor={palette.textOnDarkMuted}
              autoCapitalize="none"
              autoCorrect={false}
              returnKeyType="done"
              onSubmitEditing={() => submit(code)}
              testID="scan-token-input"
            />
            <Button
              label="Validate"
              variant="gold"
              onPress={() => submit(code)}
              disabled={busy || !code.trim()}
              loading={busy}
              testID="scan-submit"
            />
            {CAMERA_READS ? (
              <Pressable onPress={() => setManualOpen(false)} style={styles.pill} accessibilityRole="button">
                <Text style={styles.pillText}>Back to the camera</Text>
              </Pressable>
            ) : null}
          </View>
        ) : (
          <Pressable
            onPress={() => setManualOpen(true)}
            style={styles.pill}
            accessibilityRole="button"
            testID="scan-manual-toggle"
          >
            <Ionicons name="keypad-outline" size={16} color={palette.textOnDarkMuted} />
            <Text style={styles.pillText}>Enter code manually</Text>
          </Pressable>
        )}
      </SafeAreaView>

      {outcome ? (
        <Flood outcome={outcome} delivering={delivering} onDeliver={deliver} onDismiss={holds ? undefined : dismiss} />
      ) : null}
    </View>
  );
}

// ── The flood ────────────────────────────────────────────────────────────────

function Flood({
  outcome,
  delivering,
  onDeliver,
  onDismiss,
}: {
  outcome: Outcome;
  delivering: boolean;
  onDeliver: () => void;
  onDismiss?: () => void;
}) {
  const isReward =
    outcome.kind === "redeem" || (outcome.kind === "visit" && outcome.unlocked.length > 0);
  const bg = outcome.kind === "error" ? palette.walnut : isReward ? palette.gold : palette.emerald;
  // Dark ink on the gold floods, ivory everywhere else.
  const ink = isReward ? palette.surfaceDarker : palette.ivory;
  const inkSoft = isReward ? "rgba(11,8,5,0.72)" : palette.textOnDarkMuted;

  let body: ReactNode;
  if (outcome.kind === "error") {
    body = (
      <>
        <Ionicons name="alert-circle-outline" size={56} color={palette.errorOnDark} />
        <Text style={[styles.floodTitle, { color: ink }]}>{outcome.message}</Text>
        <Button label="Try again" variant="ghostLight" onPress={onDismiss} style={styles.floodBtn} />
      </>
    );
  } else if (outcome.kind === "visit") {
    body = (
      <>
        <Ionicons name="checkmark-circle" size={56} color={ink} />
        <Text style={[styles.floodName, { color: ink }]} numberOfLines={2} adjustsFontSizeToFit>
          {outcome.customer.name}
        </Text>
        <Text style={[styles.floodLine, { color: ink }]}>
          Visit {outcome.visits}
          {outcome.goal ? ` of ${outcome.goal}` : ""}
        </Text>
        {outcome.unlocked.length > 0 ? (
          <Text style={[styles.floodReward, { color: ink }]}>
            Reward unlocked · {outcome.unlocked.map((u) => u.name).join(", ")}
          </Text>
        ) : null}
      </>
    );
  } else if (outcome.status === "delivered") {
    body = (
      <>
        <Ionicons name="checkmark-circle" size={56} color={ink} />
        <Text style={[styles.floodLine, { color: ink }]}>Delivered</Text>
        <Text style={[styles.floodReward, { color: inkSoft }]}>
          {outcome.reward} · {outcome.customer.name}
        </Text>
      </>
    );
  } else {
    body = (
      <>
        <Ionicons name="wine-outline" size={56} color={ink} />
        <Text style={[styles.floodSmall, { color: inkSoft }]}>Hand over</Text>
        <Text style={[styles.floodName, { color: ink }]} numberOfLines={3} adjustsFontSizeToFit>
          {outcome.reward}
        </Text>
        <Text style={[styles.floodLine, { color: ink }]}>for {outcome.customer.name}</Text>
        <Button
          label="Delivered"
          variant="emerald"
          onPress={onDeliver}
          loading={delivering}
          style={styles.floodBtn}
          testID="scan-deliver"
        />
        <Text style={[styles.floodSmall, { color: inkSoft }]}>Tap when it reaches the table</Text>
      </>
    );
  }

  return (
    <Animated.View
      entering={FadeIn.duration(220).reduceMotion(ReduceMotion.System)}
      exiting={FadeOut.duration(160).reduceMotion(ReduceMotion.System)}
      style={[StyleSheet.absoluteFill, { backgroundColor: bg }]}
      accessibilityLiveRegion="polite"
      testID="scan-result"
    >
      <Grain opacity={0.08} />
      <Pressable style={styles.floodPress} onPress={onDismiss} disabled={!onDismiss}>
        <SafeAreaView style={styles.floodInner} edges={["top", "bottom"]}>
          {body}
          {onDismiss ? <Text style={[styles.floodHint, { color: inkSoft }]}>Tap to continue</Text> : null}
        </SafeAreaView>
      </Pressable>
    </Animated.View>
  );
}

// ── Styles ───────────────────────────────────────────────────────────────────

const FINDER = 256;
const CORNER = 30;

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: palette.walnut },
  safe: { flex: 1, paddingHorizontal: spacing.lg },

  header: { flexDirection: "row", alignItems: "center", gap: spacing.sm, paddingTop: spacing.sm },
  shift: { ...type.strong, flex: 1, color: palette.ivory },
  signOut: { width: 44, height: 44, alignItems: "center", justifyContent: "center" },

  stage: { flex: 1, alignItems: "center", justifyContent: "center", gap: spacing.md },
  finder: { width: FINDER, height: FINDER },
  corner: {
    position: "absolute",
    width: CORNER,
    height: CORNER,
    borderColor: palette.gold,
    borderWidth: 3,
  },
  tl: { top: 0, left: 0, borderRightWidth: 0, borderBottomWidth: 0, borderTopLeftRadius: radii.sm },
  tr: { top: 0, right: 0, borderLeftWidth: 0, borderBottomWidth: 0, borderTopRightRadius: radii.sm },
  bl: { bottom: 0, left: 0, borderRightWidth: 0, borderTopWidth: 0, borderBottomLeftRadius: radii.sm },
  br: { bottom: 0, right: 0, borderLeftWidth: 0, borderTopWidth: 0, borderBottomRightRadius: radii.sm },
  caption: {
    ...type.bodyMedium,
    color: palette.ivory,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: radii.full,
    backgroundColor: "rgba(11,8,5,0.55)",
    overflow: "hidden",
  },

  ask: { alignItems: "center", gap: spacing.sm, paddingHorizontal: spacing.lg },
  askTitle: { ...type.h2, color: palette.ivory, textAlign: "center", marginTop: spacing.xs },
  askBody: { ...type.body, color: palette.textOnDarkMuted, textAlign: "center" },
  askBtn: { alignSelf: "stretch", marginTop: spacing.sm },

  trail: { gap: 6, marginBottom: spacing.sm },
  trailRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: radii.md,
    backgroundColor: "rgba(11,8,5,0.55)",
  },
  trailLabel: { ...type.bodySm, flex: 1, color: palette.ivory },
  trailAgo: { ...type.mono, fontSize: 11, color: palette.textOnDarkMuted },

  pill: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    minHeight: 48,
    alignSelf: "center",
    paddingHorizontal: spacing.lg,
    borderRadius: radii.full,
    backgroundColor: "rgba(11,8,5,0.55)",
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: palette.borderDark,
    marginBottom: spacing.sm,
  },
  pillText: { ...type.buttonSm, color: palette.ivory },

  manual: { gap: spacing.sm, marginBottom: spacing.sm },
  input: {
    ...type.mono,
    minHeight: 52,
    paddingHorizontal: spacing.md,
    borderRadius: radii.md,
    color: palette.ivory,
    backgroundColor: "rgba(245,239,226,0.08)",
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: palette.borderGold,
  },

  floodPress: { flex: 1 },
  floodInner: { flex: 1, alignItems: "center", justifyContent: "center", gap: spacing.sm, paddingHorizontal: spacing.xl },
  floodName: { ...type.display, textAlign: "center", marginTop: spacing.sm },
  floodLine: { ...type.h2, textAlign: "center" },
  floodReward: { ...type.strong, textAlign: "center", marginTop: spacing.xs },
  floodTitle: { ...type.h2, textAlign: "center", marginTop: spacing.sm },
  floodSmall: { ...type.bodyMedium, textAlign: "center" },
  floodBtn: { alignSelf: "stretch", marginTop: spacing.lg },
  floodHint: { ...type.bodySm, position: "absolute", bottom: spacing.xl, alignSelf: "center" },
});
