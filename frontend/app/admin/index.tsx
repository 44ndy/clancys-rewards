// Owner Dashboard.
import { useCallback, useEffect, useState } from "react";
import { ActivityIndicator, StyleSheet, Text, View } from "react-native";
import { useFocusEffect } from "expo-router";
import { Ionicons } from "@expo/vector-icons";

import { palette, radii, spacing, fonts, shadow , type } from "@/src/lib/theme";
import { api, type DashboardData } from "@/src/lib/api";
import { useAuth } from "@/src/state/auth";
import { AdminScreen } from "@/src/components/AdminScreen";

export default function AdminDashboard() {
  const { user } = useAuth();
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    try { setData(await api.adminDashboard()); }
    catch (e: any) { console.log("dashboard", e.message); }
  }, []);

  useEffect(() => { (async () => { setLoading(true); await load(); setLoading(false); })(); }, [load]);
  useFocusEffect(useCallback(() => { load(); }, [load]));

  return (
    <AdminScreen
      title={`Sláinte, ${user?.name.split(" ")[0]}`}
      eyebrow="HOUSE OVERVIEW"
      subtitle="Today at Clancy's, at a glance."
    >
      {loading || !data ? (
        <ActivityIndicator color={palette.gold} />
      ) : (
        <>
          <View style={styles.grid}>
            <Stat icon="people" label="Customers" value={data.total_customers} color={palette.emerald} />
            <Stat icon="ribbon" label="Active members" value={data.active_members} color={palette.gold} />
            <Stat icon="footsteps" label="Visits today" value={data.today_visits} color={palette.walnutLight} />
            <Stat icon="gift" label="Rewards redeemed" value={data.rewards_redeemed_total} color={palette.success} />
          </View>

          <Card title="This week" testID="week-card">
            <View style={styles.weekRow}>
              <WeekStat label="Visits" value={data.week_visits} />
              <WeekStat label="Rewards" value={data.week_redemptions} />
            </View>
          </Card>

          {data.daily_visits_series.length > 0 && (
            <Card title="Daily visits · last 7d" testID="chart-card">
              <Sparkline series={data.daily_visits_series} />
            </Card>
          )}

          {data.top_rewards.length > 0 && (
            <Card title="Top rewards · 30d" testID="top-rewards">
              {data.top_rewards.map((r, i) => (
                <View key={r.name} style={styles.topRow}>
                  <Text style={styles.topRank}>#{i + 1}</Text>
                  <Text style={styles.topName}>{r.name}</Text>
                  <Text style={styles.topCount}>{r.count}</Text>
                </View>
              ))}
            </Card>
          )}
        </>
      )}
    </AdminScreen>
  );
}

function Stat({ icon, label, value, color }: any) {
  return (
    <View style={[styles.stat, shadow.soft]}>
      <View style={[styles.statIcon, { backgroundColor: color + "20" }]}>
        <Ionicons name={icon} size={18} color={color} />
      </View>
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

function Card({ title, children, testID }: any) {
  return (
    <View style={[styles.card, shadow.soft]} testID={testID}>
      <Text style={styles.cardTitle}>{title}</Text>
      {children}
    </View>
  );
}

function WeekStat({ label, value }: { label: string; value: number }) {
  return (
    <View style={styles.weekStat}>
      <Text style={styles.weekValue}>{value}</Text>
      <Text style={styles.weekLabel}>{label}</Text>
    </View>
  );
}

// The API only returns days that actually had visits, so a quiet week arrives as
// one or two points. Padding the window out to a full 7 days keeps the chart the
// same shape all week — and stops a single visit from rendering as one enormous
// green slab across the card.
function Sparkline({ series }: { series: { date: string; count: number }[] }) {
  const byDate = new Map(series.map((s) => [s.date, s.count]));
  const days = Array.from({ length: 7 }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - (6 - i));
    const key = d.toISOString().slice(0, 10);
    return { key, label: String(d.getDate()).padStart(2, "0"), count: byDate.get(key) ?? 0 };
  });
  const max = Math.max(...days.map((d) => d.count), 1);

  return (
    <View style={styles.spark}>
      {days.map((d) => (
        <View key={d.key} style={styles.sparkCol}>
          <View style={styles.sparkTrack}>
            <View
              style={[
                styles.sparkBar,
                {
                  height: `${(d.count / max) * 100}%`,
                  backgroundColor: d.count > 0 ? palette.emerald : "rgba(27,19,12,0.08)",
                  minHeight: d.count > 0 ? 6 : 3,
                },
              ]}
            />
          </View>
          <Text style={styles.sparkLabel}>{d.label}</Text>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  grid: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm },
  stat: {
    flexBasis: "48%", flexGrow: 1, backgroundColor: palette.surface, padding: spacing.md,
    borderRadius: radii.lg, borderWidth: 1, borderColor: palette.border, gap: 4,
  },
  statIcon: { width: 32, height: 32, borderRadius: 16, alignItems: "center", justifyContent: "center" },
  statValue: { fontSize: 28, fontFamily: fonts.serif, fontWeight: "700", color: palette.textPrimary, marginTop: 4 },
  statLabel: { color: palette.textMuted, fontSize: 11, fontWeight: "600" },
  card: { backgroundColor: palette.surface, borderRadius: radii.lg, borderWidth: 1, borderColor: palette.border, padding: spacing.md, marginTop: spacing.md, gap: spacing.sm },
  cardTitle: { fontFamily: fonts.serif, fontSize: 17, fontWeight: "700", color: palette.textPrimary },
  weekRow: { flexDirection: "row", gap: spacing.md },
  weekStat: { flex: 1 },
  weekValue: { fontSize: 22, fontFamily: fonts.serif, fontWeight: "700", color: palette.emerald },
  weekLabel: { fontSize: 11, color: palette.textMuted, fontWeight: "600", marginTop: 2 },
  spark: { flexDirection: "row", alignItems: "flex-end", gap: 8, paddingTop: 8 },
  sparkCol: { flex: 1, alignItems: "center", gap: 6 },
  sparkTrack: { height: 88, width: "100%", maxWidth: 26, justifyContent: "flex-end" },
  sparkBar: { width: "100%", borderRadius: 5 },
  sparkLabel: { ...type.mono, fontSize: 10, color: palette.textMuted },
  topRow: { flexDirection: "row", alignItems: "center", gap: spacing.sm, paddingVertical: 6 },
  topRank: { width: 28, ...type.numeralSm, fontSize: 15, color: palette.goldOnLight },
  topName: { flex: 1, color: palette.textPrimary, fontWeight: "600" },
  topCount: { color: palette.emerald, fontWeight: "700" },
});
