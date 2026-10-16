// The house menu — rebuilt around the dish photograph.
//
// Clancy's serves 43 dishes across four services, so the two things that decide
// whether this screen works are density and the empty state:
//
//   · Density. A full-bleed photo card per dish would put one and a half dishes
//     on a phone screen and turn Dinner into a twenty-one-screen scroll. These
//     are rows instead: a 108pt plate on the left, the printed-menu line on the
//     right — name, leader rule, price — and two lines of description. Six
//     dishes a screen, and the photograph still leads.
//   · The empty state. Every dish is photoless today, and twenty identical grey
//     rectangles would read as a broken screen. So a dish with no photo gets a
//     plate of its own: its initial set in Playfair on the house walnut, with
//     the course's own tint. It reads as designed rather than missing, each row
//     differs from its neighbour, and a real photograph simply takes its place.
//
// Rows on a hairline rather than boxed cards: the card-per-item grid is the
// generic solution, and the printed-menu character is what this brand has.

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Image } from "expo-image";
import { useFocusEffect } from "expo-router";
import { LinearGradient } from "expo-linear-gradient";
import Animated, { FadeInDown, ReduceMotion } from "react-native-reanimated";

import { gradients, palette, radii, spacing, type } from "@/src/lib/theme";
import { api, imageUrl, type MenuItem, type MenuSection } from "@/src/lib/api";
import { Grain } from "@/src/components/ui/Grain";
import { PressableScale } from "@/src/components/ui/PressableScale";

const enter = (i: number) =>
  FadeInDown.delay(Math.min(i, 8) * 45)
    .duration(380)
    .reduceMotion(ReduceMotion.System);

type Row =
  | { kind: "course"; course: string }
  | { kind: "item"; item: MenuItem; i: number };

export default function Menu() {
  const [sections, setSections] = useState<MenuSection[]>([]);
  const [activeCat, setActiveCat] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const s = await api.menu();
      setSections(s);
      setError(null);
      if (s.length) setActiveCat((p) => p ?? s[0].category);
    } catch (e: any) {
      setError(e?.message || "Couldn't load the menu.");
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
    }, [load]),
  );

  const onRefresh = async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  };

  const section = useMemo(
    () => sections.find((s) => s.category === activeCat) ?? null,
    [sections, activeCat],
  );

  // One flat list so the entrance stagger counts dishes, not headings, and a
  // service with no courses (Breakfast, Dessert) renders with no headings.
  const rows = useMemo(() => {
    const out: Row[] = [];
    let i = 0;
    for (const g of section?.courses ?? []) {
      if (g.course) out.push({ kind: "course", course: g.course });
      for (const it of g.items) out.push({ kind: "item", item: it, i: i++ });
    }
    return out;
  }, [section]);

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
            <Text style={styles.eyebrow}>THE HOUSE MENU</Text>
            <Text style={styles.title}>From our kitchen</Text>
            <Text style={styles.subtitle}>Seasonal Irish produce, slow-cooked with care.</Text>
          </View>
        </SafeAreaView>
      </View>

      {/* ── Services ─────────────────────────────────────────────────────── */}
      {/* Wrapped, not a horizontal rail: on a 375pt phone a rail hid the last
          service behind a swipe with nothing to hint at it. */}
      <View style={styles.chipRow}>
        {sections.map((s) => {
          const active = s.category === activeCat;
          return (
            <PressableScale
              key={s.category}
              onPress={() => setActiveCat(s.category)}
              style={[styles.chip, active && styles.chipActive]}
              accessibilityRole="button"
              accessibilityState={{ selected: active }}
              testID={`menu-cat-${s.category}`}
            >
              <Text style={[styles.chipText, active && styles.chipTextActive]}>{s.category}</Text>
            </PressableScale>
          );
        })}
      </View>

      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={palette.gold} />
        }
      >
        {error ? (
          <Text style={styles.notice}>{error}</Text>
        ) : rows.length === 0 ? (
          <Text style={styles.notice}>Nothing on this menu yet.</Text>
        ) : null}

        {rows.map((row) =>
          row.kind === "course" ? (
            <View key={`course-${row.course}`} style={styles.courseHead}>
              <Text style={styles.courseName}>{row.course}</Text>
              <View style={styles.courseRule} />
            </View>
          ) : (
            <Animated.View key={row.item.item_id} entering={enter(row.i)}>
              <Dish item={row.item} />
            </Animated.View>
          ),
        )}

        <Text style={styles.footnote}>
          Please tell your server about any allergies. All prices include VAT.
        </Text>
      </ScrollView>
    </View>
  );
}

// ── One dish ─────────────────────────────────────────────────────────────────

function Dish({ item }: { item: MenuItem }) {
  const src = imageUrl(item.image_url);
  return (
    <View style={styles.row} testID={`menu-item-${item.item_id}`}>
      <Plate src={src} name={item.name} />

      <View style={styles.body}>
        <View style={styles.line}>
          <Text style={styles.name} numberOfLines={2}>
            {item.name}
          </Text>
          <View style={styles.leader} />
          <Text style={styles.price}>€{item.price.toFixed(2)}</Text>
        </View>
        {item.description ? (
          <Text style={styles.desc} numberOfLines={2}>
            {item.description}
          </Text>
        ) : null}
      </View>
    </View>
  );
}

// The photograph, or the plate that stands in for one until it arrives.
function Plate({ src, name }: { src?: string; name: string }) {
  if (src) {
    return (
      <Image
        source={{ uri: src }}
        style={styles.plate}
        contentFit="cover"
        transition={200}
        accessibilityIgnoresInvertColors
      />
    );
  }
  const initial = name.replace(/[^A-Za-z]/g, "").charAt(0).toUpperCase() || "C";
  return (
    <View style={[styles.plate, styles.plateEmpty]} accessibilityElementsHidden>
      <Grain opacity={0.1} />
      <Text style={styles.initial}>{initial}</Text>
    </View>
  );
}

// ── Styles ───────────────────────────────────────────────────────────────────

const PLATE = 108;

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: palette.canvas },
  center: { flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: palette.canvas },

  hero: { overflow: "hidden", borderBottomLeftRadius: radii.xxl, borderBottomRightRadius: radii.xxl },
  heroContent: { padding: spacing.lg, paddingTop: spacing.sm, paddingBottom: spacing.lg },
  eyebrow: { ...type.eyebrow, color: palette.gold },
  title: { ...type.h1, color: palette.ivory, marginTop: 6 },
  subtitle: { ...type.quoteSm, color: palette.textOnDarkMuted, marginTop: 4 },

  chipRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    paddingBottom: spacing.xs,
  },
  chip: {
    height: 38,
    paddingHorizontal: 15,
    borderRadius: radii.full,
    backgroundColor: palette.surface,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: palette.border,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  chipActive: { backgroundColor: palette.surfaceDarker, borderColor: palette.surfaceDarker },
  chipText: { ...type.buttonSm, color: palette.textSecondary },
  chipTextActive: { color: palette.gold },

  scroll: { paddingHorizontal: spacing.lg, paddingBottom: 130 },

  // Course heading: a small-caps label against a rule that runs to the edge.
  courseHead: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    marginTop: spacing.lg,
    marginBottom: spacing.xs,
  },
  courseName: { ...type.eyebrow, color: palette.goldOnLight },
  courseRule: { flex: 1, height: StyleSheet.hairlineWidth, backgroundColor: "rgba(134,108,47,0.4)" },

  row: {
    flexDirection: "row",
    gap: spacing.md,
    paddingVertical: spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: palette.border,
  },
  plate: {
    width: PLATE,
    height: PLATE,
    borderRadius: radii.lg,
    overflow: "hidden",
    backgroundColor: palette.surfaceMuted,
  },
  plateEmpty: {
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: palette.walnut,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: palette.borderGold,
  },
  initial: { ...type.display, fontSize: 44, lineHeight: 52, color: "rgba(201,169,97,0.55)" },

  body: { flex: 1, justifyContent: "center", gap: 5 },
  line: { flexDirection: "row", alignItems: "baseline", gap: spacing.sm },
  name: { ...type.h3, fontSize: 17, color: palette.textPrimary, flexShrink: 1 },
  leader: {
    flex: 1,
    minWidth: spacing.sm,
    height: StyleSheet.hairlineWidth,
    backgroundColor: palette.border,
  },
  price: { ...type.numeralSm, fontSize: 15, color: palette.goldOnLight },
  desc: { ...type.bodySm, color: palette.textSecondary, lineHeight: 19 },

  notice: { ...type.body, color: palette.textMuted, textAlign: "center", marginTop: spacing.xl },
  footnote: {
    ...type.bodySm,
    color: palette.textMuted,
    textAlign: "center",
    marginTop: spacing.xl,
    fontStyle: "italic",
  },
});
