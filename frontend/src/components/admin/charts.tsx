// Small, dependency-free charts for the owner's dashboard.
//
// Built from plain Views so they render the same on Android, iOS and web, with
// no chart library to pull into the APK. The rules they follow:
//   · one green for the data, one darker green for the bar you tapped;
//   · bars sit on a baseline with only their top corners rounded;
//   · only the tallest bar carries its number — tap any bar to read its own;
//   · all text is ink (primary / secondary / muted), never the bar colour.
//
// The two chart colours were checked for colour-blind separation and 3:1
// contrast on white before they went in.

import { useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { palette, radii, spacing, type } from "@/src/lib/theme";

export const CHART = {
  green: "#1A7A4C",
  greenActive: "#073A24",
  gold: "#B8862B",
  track: "rgba(27,19,12,0.07)",
  baseline: "rgba(27,19,12,0.14)",
};

// ── Vertical bars ────────────────────────────────────────────────────────────

export type Bar = {
  key: string;
  /** Under the bar. Leave "" to skip a label. */
  label: string;
  /** Read out when the bar is tapped, e.g. "Tue 12 Nov". */
  long: string;
  value: number;
  /** Draw the label in bold (today, this week). */
  strong?: boolean;
};

export function BarChart({
  data,
  unit,
  caption,
  height = 112,
  testID,
}: {
  data: Bar[];
  /** Singular and plural, e.g. ["visit", "visits"]. */
  unit: [string, string];
  /** What the chart says when nothing is tapped. */
  caption: string;
  height?: number;
  testID?: string;
}) {
  const [selected, setSelected] = useState<string | null>(null);
  const max = Math.max(1, ...data.map((d) => d.value));
  const peakKey = data.reduce((best, d) => (d.value > best.value ? d : best), data[0] ?? { key: "", value: 0 }).key;
  const picked = data.find((d) => d.key === selected);

  return (
    <View testID={testID}>
      <Text style={styles.readout} numberOfLines={2}>
        {picked ? (
          <>
            <Text style={styles.readoutStrong}>{picked.long}</Text>
            {"  ·  "}
            {picked.value} {picked.value === 1 ? unit[0] : unit[1]}
          </>
        ) : (
          caption
        )}
      </Text>

      <View style={[styles.plot, { height: height + 18 }]}>
        {data.map((d) => {
          const active = d.key === selected;
          const showPeak = !picked && d.key === peakKey && d.value > 0;
          const h = d.value > 0 ? Math.max(4, (d.value / max) * height) : 3;
          // Worked out here, not inside the style object: Reanimated's Babel
          // plugin reads any `.value` in a style as a shared value and warns.
          const fill = d.value > 0 ? (active ? CHART.greenActive : CHART.green) : CHART.track;
          return (
            <Pressable
              key={d.key}
              style={styles.col}
              onPress={() => setSelected(active ? null : d.key)}
              accessibilityRole="button"
              accessibilityLabel={`${d.long}, ${d.value} ${d.value === 1 ? unit[0] : unit[1]}`}
              hitSlop={{ top: 8, bottom: 8 }}
            >
              {showPeak || active ? <Text style={styles.peak}>{d.value}</Text> : null}
              <View
                style={[
                  styles.bar,
                  { height: h, backgroundColor: fill },
                ]}
              />
            </Pressable>
          );
        })}
      </View>
      <View style={styles.baseline} />
      <View style={styles.labels}>
        {data.map((d) => (
          <View key={d.key} style={styles.labelCol}>
            {d.label ? (
              <Text
                style={[styles.axisLabel, d.strong && styles.axisLabelStrong]}
                numberOfLines={1}
              >
                {d.label}
              </Text>
            ) : null}
          </View>
        ))}
      </View>
    </View>
  );
}

// ── Horizontal bars (a ranked list you can read like a sentence) ─────────────

export type Row = { key: string; label: string; value: number; note?: string };

export function BarList({
  rows,
  stacked,
  testID,
}: {
  rows: Row[];
  /** Label above the bar instead of beside it — for long names. */
  stacked?: boolean;
  testID?: string;
}) {
  const max = Math.max(1, ...rows.map((r) => r.value));
  return (
    <View style={{ gap: stacked ? 12 : 9 }} testID={testID}>
      {rows.map((r) => {
        const pct = r.value > 0 ? Math.max(3, (r.value / max) * 100) : 0;
        const bar = (
          <View style={stacked ? styles.hTrackFull : styles.hTrack}>
            {pct > 0 ? <View style={[styles.hBar, { width: `${pct}%` }]} /> : null}
          </View>
        );
        return stacked ? (
          <View key={r.key} accessible accessibilityLabel={`${r.label}: ${r.value}`}>
            <View style={styles.stackHead}>
              <Text style={styles.hLabelWide} numberOfLines={1}>
                {r.label}
              </Text>
              <Text style={styles.hValue}>{r.value}</Text>
            </View>
            {bar}
          </View>
        ) : (
          <View key={r.key} style={styles.hRow} accessible accessibilityLabel={`${r.label}: ${r.value}`}>
            <Text style={styles.hLabel} numberOfLines={1}>
              {r.label}
            </Text>
            {bar}
            <Text style={styles.hValue}>{r.value}</Text>
          </View>
        );
      })}
    </View>
  );
}

// ── Two-part split (returning guests vs first visits) ────────────────────────

export function Split({
  parts,
  testID,
}: {
  parts: { key: string; label: string; value: number; color: string }[];
  testID?: string;
}) {
  const total = parts.reduce((s, p) => s + p.value, 0);
  return (
    <View style={{ gap: spacing.sm }} testID={testID}>
      <View style={styles.splitBar}>
        {parts
          .filter((p) => p.value > 0)
          .map((p) => {
            const share = p.value;
            return <View key={p.key} style={{ flex: share, backgroundColor: p.color, borderRadius: 4 }} />;
          })}
      </View>
      <View style={styles.legend}>
        {parts.map((p) => (
          <View key={p.key} style={styles.legendItem}>
            <View style={[styles.legendDot, { backgroundColor: p.color }]} />
            <Text style={styles.legendText}>
              <Text style={styles.legendStrong}>{total ? Math.round((p.value / total) * 100) : 0}%</Text>{" "}
              {p.label} ({p.value})
            </Text>
          </View>
        ))}
      </View>
    </View>
  );
}

// ── Card shell ───────────────────────────────────────────────────────────────

export function ChartCard({
  title,
  period,
  children,
  empty,
  testID,
}: {
  title: string;
  period: string;
  children: React.ReactNode;
  /** When set, shown instead of the chart. */
  empty?: string | false;
  testID?: string;
}) {
  return (
    <View style={styles.card} testID={testID}>
      <View style={styles.cardHead}>
        <Text style={styles.cardTitle}>{title}</Text>
        <Text style={styles.period}>{period}</Text>
      </View>
      {empty ? <Text style={styles.empty}>{empty}</Text> : children}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: palette.surface,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: palette.border,
    padding: spacing.md,
    marginTop: spacing.md,
    gap: spacing.sm,
  },
  cardHead: { flexDirection: "row", alignItems: "baseline", justifyContent: "space-between", gap: spacing.sm },
  cardTitle: { ...type.h3, fontSize: 17, color: palette.textPrimary, flexShrink: 1 },
  period: { ...type.bodySm, fontSize: 11.5, color: palette.textMuted },
  empty: { ...type.bodySm, color: palette.textMuted, paddingVertical: spacing.sm },

  readout: { ...type.bodySm, color: palette.textSecondary, minHeight: 19 },
  readoutStrong: { fontFamily: type.bodyMedium.fontFamily, color: palette.textPrimary },

  plot: { flexDirection: "row", alignItems: "flex-end", gap: 3, paddingTop: 4 },
  col: { flex: 1, height: "100%", alignItems: "center", justifyContent: "flex-end" },
  bar: { width: "78%", maxWidth: 30, borderTopLeftRadius: 4, borderTopRightRadius: 4 },
  peak: { ...type.mono, fontSize: 10.5, color: palette.textPrimary, marginBottom: 3 },
  baseline: { height: StyleSheet.hairlineWidth, backgroundColor: CHART.baseline },
  labels: { flexDirection: "row", gap: 3, marginTop: 5 },
  labelCol: { flex: 1, alignItems: "center" },
  axisLabel: { ...type.mono, fontSize: 9.5, color: palette.textMuted, width: 44, textAlign: "center" },
  axisLabelStrong: { color: palette.textPrimary, fontWeight: "700" },

  hRow: { flexDirection: "row", alignItems: "center", gap: spacing.sm },
  hLabel: { ...type.bodySm, width: 92, color: palette.textSecondary },
  hLabelWide: { ...type.bodySm, flex: 1, color: palette.textSecondary },
  stackHead: { flexDirection: "row", alignItems: "baseline", gap: spacing.sm, marginBottom: 5 },
  hTrack: { flex: 1, height: 12, borderRadius: 4, backgroundColor: CHART.track, overflow: "hidden" },
  hTrackFull: { height: 12, borderRadius: 4, backgroundColor: CHART.track, overflow: "hidden" },
  hBar: { height: "100%", borderRadius: 4, backgroundColor: CHART.green },
  hValue: { ...type.mono, fontSize: 12, minWidth: 26, textAlign: "right", color: palette.textPrimary },

  splitBar: { flexDirection: "row", gap: 2, height: 16, borderRadius: 4, overflow: "hidden" },
  legend: { gap: 6 },
  legendItem: { flexDirection: "row", alignItems: "center", gap: 8 },
  legendDot: { width: 10, height: 10, borderRadius: 3 },
  legendText: { ...type.bodySm, color: palette.textSecondary },
  legendStrong: { color: palette.textPrimary, fontFamily: type.bodyMedium.fontFamily },
});
