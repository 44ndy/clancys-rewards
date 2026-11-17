// A sheet that rises over the screen to show the full story behind a card:
// the photo large, the whole text, and what to do next. It never navigates —
// the guest stays where they were and swipes it away (or taps outside).
//
// Motion: one rise on open (340ms, ease-out) and one fall on close (240ms).
// The backdrop fades with it. Reduce Motion swaps the travel for a plain fade.
// The photo end of the sheet can be dragged down to dismiss it.

import { useCallback, useEffect, useState } from "react";
import {
  Dimensions,
  Image,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { Gesture, GestureDetector, GestureHandlerRootView } from "react-native-gesture-handler";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Animated, {
  Easing,
  runOnJS,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withSpring,
  withTiming,
} from "react-native-reanimated";

import { gradients, palette, radii, spacing, type } from "@/src/lib/theme";
import { Button } from "@/src/components/ui/Button";
import { Grain } from "@/src/components/ui/Grain";

type Icon = keyof typeof Ionicons.glyphMap;

export type SheetContent = {
  key: string;
  image?: string;
  /** Shown instead of a photo when there isn't one. */
  color?: string;
  eyebrow?: string;
  title: string;
  /** Small facts under the title: a price, a date. */
  chips?: { icon: Icon; text: string }[];
  body?: string;
  /** Longer text the admin can add; shown under the body. */
  extra?: string;
  rows?: { icon: Icon; label: string; text: string }[];
  actions?: { label: string; icon?: Icon; variant?: "emerald" | "ghostLight"; onPress: () => void; testID?: string }[];
};

const SCREEN_H = Dimensions.get("window").height;
const HERO_H = Math.min(300, Math.round(SCREEN_H * 0.36));
const OPEN = { duration: 340, easing: Easing.out(Easing.cubic) };
const CLOSE = { duration: 240, easing: Easing.in(Easing.cubic) };

export function DetailSheet({
  content,
  onClose,
  testID = "detail-sheet",
}: {
  /** null = closed. */
  content: SheetContent | null;
  onClose: () => void;
  testID?: string;
}) {
  const insets = useSafeAreaInsets();
  const reduced = useReducedMotion();
  // Keep showing the last content while the sheet slides away.
  const [shown, setShown] = useState<SheetContent | null>(content);
  const y = useSharedValue(SCREEN_H);
  const fade = useSharedValue(0);

  const finish = useCallback(() => setShown(null), []);

  useEffect(() => {
    if (content) {
      setShown(content);
      y.value = reduced ? 0 : SCREEN_H;
      fade.value = 0;
      y.value = withTiming(0, reduced ? { duration: 0 } : OPEN);
      fade.value = withTiming(1, { duration: reduced ? 160 : 260 });
    } else if (shown) {
      fade.value = withTiming(0, { duration: reduced ? 140 : 220 });
      y.value = withTiming(reduced ? 0 : SCREEN_H, reduced ? { duration: 140 } : CLOSE, (done) => {
        if (done) runOnJS(finish)();
      });
      if (reduced) setTimeout(finish, 160);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [content]);

  // Drag the photo down to let go of the sheet.
  const drag = Gesture.Pan()
    .activeOffsetY(8)
    .onUpdate((e) => {
      y.value = Math.max(0, e.translationY);
    })
    .onEnd((e) => {
      if (e.translationY > 120 || e.velocityY > 900) runOnJS(onClose)();
      else y.value = withSpring(0, { damping: 22, stiffness: 240 });
    });

  const sheetStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: y.value }],
    opacity: reduced ? fade.value : 1,
  }));
  const backdropStyle = useAnimatedStyle(() => ({ opacity: fade.value }));

  if (!shown) return null;
  const c = shown;

  return (
    <Modal visible transparent animationType="none" statusBarTranslucent onRequestClose={onClose}>
      <GestureHandlerRootView style={styles.fill}>
        <Animated.View style={[styles.backdrop, backdropStyle]}>
          <Pressable
            style={styles.fill}
            onPress={onClose}
            accessibilityRole="button"
            accessibilityLabel="Close"
            testID={`${testID}-backdrop`}
          />
        </Animated.View>

        <Animated.View
          style={[styles.sheet, { maxHeight: SCREEN_H * 0.9 }, sheetStyle]}
          accessibilityViewIsModal
          testID={testID}
        >
          <GestureDetector gesture={drag}>
            <View style={[styles.hero, { height: HERO_H }]}>
              {c.image ? (
                <Image source={{ uri: c.image }} style={StyleSheet.absoluteFill} resizeMode="cover" />
              ) : (
                <View style={[StyleSheet.absoluteFill, { backgroundColor: c.color || palette.emerald }]} />
              )}
              <LinearGradient
                colors={gradients.photoScrim}
                locations={[0.25, 0.62, 1]}
                style={StyleSheet.absoluteFill}
              />
              <Grain opacity={0.05} />

              <View style={styles.handle} />
              <Pressable
                onPress={onClose}
                style={styles.close}
                hitSlop={8}
                accessibilityRole="button"
                accessibilityLabel="Close"
                testID={`${testID}-close`}
              >
                <Ionicons name="close" size={20} color={palette.ivory} />
              </Pressable>

              <View style={styles.heroText}>
                {c.eyebrow ? <Text style={styles.eyebrow}>{c.eyebrow}</Text> : null}
                <Text style={styles.title}>{c.title}</Text>
              </View>
            </View>
          </GestureDetector>

          <ScrollView
            contentContainerStyle={[styles.body, { paddingBottom: Math.max(insets.bottom, 16) + spacing.lg }]}
            showsVerticalScrollIndicator={false}
            bounces={false}
          >
            {c.chips?.length ? (
              <View style={styles.chips}>
                {c.chips.map((ch) => (
                  <View key={ch.text} style={styles.chip}>
                    <Ionicons name={ch.icon} size={13} color={palette.goldOnLight} />
                    <Text style={styles.chipText}>{ch.text}</Text>
                  </View>
                ))}
              </View>
            ) : null}

            {c.body ? <Text style={styles.lead}>{c.body}</Text> : null}
            {c.extra ? <Text style={styles.extra}>{c.extra}</Text> : null}

            {c.rows?.length ? (
              <View style={styles.rows}>
                {c.rows.map((r, i) => (
                  <View key={r.label} style={[styles.row, i === c.rows!.length - 1 && { borderBottomWidth: 0 }]}>
                    <View style={styles.rowIcon}>
                      <Ionicons name={r.icon} size={17} color={palette.emerald} />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.rowLabel}>{r.label}</Text>
                      <Text style={styles.rowText}>{r.text}</Text>
                    </View>
                  </View>
                ))}
              </View>
            ) : null}

            {c.actions?.length ? (
              <View style={styles.actions}>
                {c.actions.map((a) => (
                  <Button
                    key={a.label}
                    label={a.label}
                    icon={a.icon}
                    variant={a.variant ?? "emerald"}
                    onPress={a.onPress}
                    testID={a.testID}
                  />
                ))}
              </View>
            ) : null}
          </ScrollView>
        </Animated.View>
      </GestureHandlerRootView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  backdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: "rgba(11,8,5,0.62)" },
  sheet: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: palette.canvas,
    borderTopLeftRadius: radii.xxl,
    borderTopRightRadius: radii.xxl,
    overflow: "hidden",
    ...(Platform.OS === "web" ? { maxWidth: 560, marginHorizontal: "auto" as any } : null),
  },
  hero: { backgroundColor: palette.surfaceDarker, justifyContent: "flex-end" },
  handle: {
    position: "absolute",
    top: 10,
    alignSelf: "center",
    width: 42,
    height: 5,
    borderRadius: 3,
    backgroundColor: "rgba(245,239,226,0.7)",
  },
  close: {
    position: "absolute",
    top: 16,
    right: 16,
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(11,8,5,0.45)",
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "rgba(245,239,226,0.3)",
  },
  heroText: { paddingHorizontal: spacing.lg, paddingBottom: spacing.lg },
  eyebrow: { ...type.eyebrow, fontSize: 10.5, color: palette.gold },
  title: { ...type.h1, color: palette.ivory, marginTop: 6 },

  body: { padding: spacing.lg, gap: spacing.md },
  chips: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm },
  chip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: radii.full,
    backgroundColor: "rgba(134,108,47,0.10)",
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "rgba(134,108,47,0.28)",
  },
  chipText: { ...type.bodySm, fontSize: 12.5, color: palette.textPrimary },
  lead: { ...type.body, fontSize: 16, lineHeight: 24, color: palette.textPrimary },
  extra: { ...type.body, color: palette.textSecondary },

  rows: {
    backgroundColor: palette.surface,
    borderRadius: radii.lg,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: palette.border,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    paddingHorizontal: spacing.md,
    paddingVertical: 13,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: palette.border,
  },
  rowIcon: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(14,92,58,0.10)",
  },
  rowLabel: { ...type.eyebrow, fontSize: 9.5, color: palette.goldOnLight },
  rowText: { ...type.bodyMedium, color: palette.textPrimary, marginTop: 2 },

  actions: { gap: spacing.sm, marginTop: spacing.xs },
});
