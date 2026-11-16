// Owner Dashboard — the house at a glance, in charts a busy owner can read in
// a couple of seconds: how many came in, when, who, and who is close to a reward.
import { useCallback, useEffect, useState } from "react";
import { ActivityIndicator, StyleSheet, Text, View } from "react-native";
import { useFocusEffect } from "expo-router";
import { Ionicons } from "@expo/vector-icons";

import { palette, radii, spacing, fonts, shadow, type } from "@/src/lib/theme";
import { api, type DashboardData } from "@/src/lib/api";
import { useAuth } from "@/src/state/auth";
import { AdminScreen } from "@/src/components/AdminScreen";
import { BarChart, BarList, CHART, ChartCard, Split, type Bar } from "@/src/components/admin/charts";

const DAY = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const DAY_LONG = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
const WEEK_MON_FIRST = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const WEEK_MON_FIRST_LONG = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];
const MONTH = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const NOTHING_YET = "Nothing yet — this fills in as staff scan guests' QR codes.";

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
        <Dashboard data={data} />
      )}
    </AdminScreen>
  );
}

function Dashboard({ data }: { data: DashboardData }) {
  // ── Visits, day by day ─────────────────────────────────────────────────────
  const series = data.visits_14d?.length ? data.visits_14d : data.daily_visits_series;
  const days: Bar[] = series.map((d, i) => {
    const dt = parseDay(d.date);
    const last = i === series.length - 1;
    return {
      key: d.date,
      label: last ? "Today" : String(dt.getDate()),
      long: `${last ? "Today" : DAY[dt.getDay()]} ${dt.getDate()} ${MONTH[dt.getMonth()]}`,
      value: d.count,
      strong: last,
    };
  });
  const daysTotal = series.reduce((s, d) => s + d.count, 0);
  const busiestDay = series.reduce((b, d) => (d.count > b.count ? d : b), series[0] ?? { date: "", count: 0 });
  const daysCaption = daysTotal
    ? `${daysTotal} ${daysTotal === 1 ? "visit" : "visits"} · best day ${fmtDayShort(busiestDay.date)} with ${busiestDay.count}. Tap a bar for its number.`
    : "";

  // ── Hours of the day ───────────────────────────────────────────────────────
  const hours = data.visits_by_hour_30d ?? [];
  const hoursTotal = hours.reduce((s, n) => s + n, 0);
  // Show the pub's day (roughly 10am to midnight), stretched if guests came outside it.
  const used = hours.map((n, h) => (n > 0 ? h : -1)).filter((h) => h >= 0);
  const from = Math.min(10, ...(used.length ? used : [10]));
  const to = Math.max(23, ...(used.length ? used : [23]));
  const hourBars: Bar[] = [];
  for (let h = from; h <= to; h++) {
    hourBars.push({
      key: String(h),
      label: (h - from) % 3 === 0 ? fmtHour(h) : "",
      long: `${fmtHour(h)}–${fmtHour((h + 1) % 24)}`,
      value: hours[h] ?? 0,
    });
  }
  const peakHour = hours.indexOf(Math.max(...(hours.length ? hours : [0])));
  const hoursCaption = hoursTotal ? `Busiest between ${fmtHour(peakHour)} and ${fmtHour((peakHour + 1) % 24)}.` : "";

  // ── Days of the week ───────────────────────────────────────────────────────
  const weekdays = data.visits_by_weekday_8w ?? [];
  const weekdaysTotal = weekdays.reduce((s, n) => s + n, 0);
  const peakWeekday = weekdays.indexOf(Math.max(...(weekdays.length ? weekdays : [0])));

  // ── New members ────────────────────────────────────────────────────────────
  const weeks = data.new_members_weekly ?? [];
  const weeksTotal = weeks.reduce((s, w) => s + w.count, 0);
  const thisWeek = weeks.length ? weeks[weeks.length - 1].count : 0;
  const weekBars: Bar[] = weeks.map((w, i) => {
    const dt = parseDay(w.week_start);
    const last = i === weeks.length - 1;
    return {
      key: w.week_start,
      label: last ? "Now" : `${dt.getDate()} ${MONTH[dt.getMonth()]}`,
      long: last ? "This week" : `Week of ${dt.getDate()} ${MONTH[dt.getMonth()]}`,
      value: w.count,
      strong: last,
    };
  });

  // ── Who's coming in ────────────────────────────────────────────────────────
  const mix = data.customer_mix_30d ?? { first_visit: 0, returning: 0 };
  const guests = mix.first_visit + mix.returning;
  const inTen = guests ? Math.round((mix.returning / guests) * 10) : 0;

  // ── Reward progress ────────────────────────────────────────────────────────
  const progress = data.reward_progress ?? { ready: 0, one_away: 0, collecting: 0 };
  const members = progress.ready + progress.one_away + progress.collecting;

  return (
    <>
      <View style={styles.grid}>
        <Stat icon="people" label="Customers" value={data.total_customers} color={palette.emerald} />
        <Stat icon="ribbon" label="Active members" value={data.active_members} color={palette.goldOnLight} />
        <Stat icon="footsteps" label="Visits today" value={data.today_visits} color={palette.walnutLight} />
        <Stat icon="gift" label="Rewards redeemed" value={data.rewards_redeemed_total} color={palette.success} />
      </View>

      <ChartCard title="This week" period="Last 7 days" testID="week-card">
        <View style={styles.weekRow}>
          <View style={styles.weekStat}>
            <Text style={styles.weekValue}>{data.week_visits}</Text>
            <Text style={styles.weekLabel}>Visits</Text>
            <Trend now={data.week_visits} before={data.prev_week_visits} />
          </View>
          <View style={styles.weekStat}>
            <Text style={styles.weekValue}>{data.week_redemptions}</Text>
            <Text style={styles.weekLabel}>Rewards given</Text>
          </View>
        </View>
      </ChartCard>

      <ChartCard title="Visits per day" period="Last 14 days" empty={!daysTotal && NOTHING_YET} testID="chart-card">
        <BarChart data={days} unit={["visit", "visits"]} caption={daysCaption} testID="chart-days" />
      </ChartCard>

      <ChartCard title="Busiest hours" period="Last 30 days" empty={!hoursTotal && NOTHING_YET} testID="chart-hours">
        <BarChart data={hourBars} unit={["visit", "visits"]} caption={hoursCaption} height={92} />
      </ChartCard>

      <ChartCard title="Busiest days" period="Last 8 weeks" empty={!weekdaysTotal && NOTHING_YET} testID="chart-weekdays">
        <Text style={styles.caption}>
          {WEEK_MON_FIRST_LONG[peakWeekday]} is the busiest day of the week.
        </Text>
        <BarList rows={weekdays.map((n, i) => ({ key: WEEK_MON_FIRST[i], label: WEEK_MON_FIRST_LONG[i], value: n }))} />
      </ChartCard>

      <ChartCard
        title="Who's coming in"
        period="Last 30 days"
        empty={!guests && NOTHING_YET}
        testID="chart-mix"
      >
        <Text style={styles.caption}>
          {inTen} in 10 guests were regulars coming back.
        </Text>
        <Split
          parts={[
            { key: "returning", label: "regulars coming back", value: mix.returning, color: CHART.green },
            { key: "first", label: "first visit", value: mix.first_visit, color: CHART.gold },
          ]}
        />
      </ChartCard>

      <ChartCard
        title="Close to a reward"
        period="Members now"
        empty={!members && "No members with visits yet."}
        testID="chart-progress"
      >
        <Text style={styles.caption}>
          {progress.one_away} {progress.one_away === 1 ? "member is" : "members are"} one visit away
          {data.reward_threshold ? ` from the first reward (${data.reward_threshold} visits).` : " from a reward."}
        </Text>
        <BarList
          rows={[
            { key: "ready", label: "Can claim now", value: progress.ready },
            { key: "one", label: "One visit away", value: progress.one_away },
            { key: "collecting", label: "Collecting", value: progress.collecting },
          ]}
        />
      </ChartCard>

      <ChartCard title="New members" period="Last 8 weeks" empty={!weeksTotal && "No new members in the last 8 weeks."} testID="chart-members">
        <BarChart
          data={weekBars}
          unit={["new member", "new members"]}
          caption={`${thisWeek} joined this week · ${weeksTotal} in the last 8 weeks.`}
          height={84}
        />
      </ChartCard>

      <ChartCard
        title="Most popular rewards"
        period="Last 30 days"
        empty={!data.top_rewards.length && "No rewards redeemed in the last 30 days."}
        testID="top-rewards"
      >
        <BarList stacked rows={data.top_rewards.map((r) => ({ key: r.name, label: r.name, value: r.count }))} />
      </ChartCard>
    </>
  );
}

/** "▲ 3 more than last week" — words, not a percentage, so it reads at a glance. */
function Trend({ now, before }: { now: number; before?: number }) {
  if (before === undefined) return null;
  const diff = now - before;
  const up = diff > 0;
  const text =
    diff === 0
      ? "Same as the week before"
      : `${Math.abs(diff)} ${up ? "more" : "fewer"} than the week before`;
  return (
    <View style={styles.trend}>
      {diff !== 0 ? (
        <Ionicons name={up ? "arrow-up" : "arrow-down"} size={12} color={up ? palette.success : palette.error} />
      ) : null}
      <Text style={styles.trendText}>{text}</Text>
    </View>
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

/** "2026-11-16" as a local calendar day (new Date("2026-11-16") would be UTC midnight). */
function parseDay(iso: string) {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(y, (m || 1) - 1, d || 1);
}

function fmtDayShort(iso: string) {
  const dt = parseDay(iso);
  return `${DAY_LONG[dt.getDay()]} ${dt.getDate()}`;
}

function fmtHour(h: number) {
  if (h === 0) return "12am";
  if (h === 12) return "12pm";
  return h < 12 ? `${h}am` : `${h - 12}pm`;
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
  caption: { ...type.bodySm, color: palette.textSecondary },
  weekRow: { flexDirection: "row", gap: spacing.md },
  weekStat: { flex: 1 },
  weekValue: { fontSize: 26, fontFamily: fonts.serif, fontWeight: "700", color: palette.textPrimary },
  weekLabel: { fontSize: 11, color: palette.textMuted, fontWeight: "600", marginTop: 2 },
  trend: { flexDirection: "row", alignItems: "center", gap: 4, marginTop: 6 },
  trendText: { ...type.bodySm, fontSize: 11.5, color: palette.textSecondary, flexShrink: 1 },
});
