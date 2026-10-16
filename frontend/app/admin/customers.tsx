// Admin: customer list with visit stats.
import { useCallback, useEffect, useState } from "react";
import { ActivityIndicator, FlatList, StyleSheet, Text, View } from "react-native";
import { useFocusEffect } from "expo-router";
import { palette, radii, spacing, fonts, shadow , type } from "@/src/lib/theme";
import { api } from "@/src/lib/api";
import { AdminScreen } from "@/src/components/AdminScreen";

export default function AdminCustomers() {
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    try { setItems(await api.adminListCustomers()); } catch (e) { console.log(e); }
  }, []);
  useEffect(() => { (async () => { setLoading(true); await load(); setLoading(false); })(); }, [load]);
  useFocusEffect(useCallback(() => { load(); }, [load]));

  return (
    <AdminScreen title="Customers" eyebrow="GUESTBOOK" subtitle={`${items.length} registered members`}>
      <FlatList
        data={items}
        keyExtractor={(u) => u.user_id}
        contentContainerStyle={{ gap: spacing.sm, paddingBottom: 120 }}
        ListEmptyComponent={loading ? <ActivityIndicator color={palette.gold} /> : <Text style={styles.empty}>No customers yet.</Text>}
        renderItem={({ item }) => (
          <View style={[styles.card, shadow.soft]} testID={`customer-${item.user_id}`}>
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>{item.name.charAt(0).toUpperCase()}</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.name}>{item.name}</Text>
              <Text style={styles.email}>{item.email}</Text>
            </View>
            <View style={styles.statsRow}>
              <View style={styles.stat}>
                <Text style={styles.statValue}>{item.visits}</Text>
                <Text style={styles.statLabel}>visits</Text>
              </View>
              <View style={styles.stat}>
                <Text style={styles.statValue}>{item.lifetime_visits}</Text>
                <Text style={styles.statLabel}>lifetime</Text>
              </View>
            </View>
          </View>
        )}
      />
    </AdminScreen>
  );
}

const styles = StyleSheet.create({
  card: { flexDirection: "row", gap: spacing.md, padding: spacing.md, alignItems: "center", backgroundColor: palette.surface, borderRadius: radii.lg, borderWidth: 1, borderColor: palette.border },
  avatar: { width: 48, height: 48, borderRadius: 24, backgroundColor: palette.emerald + "20", alignItems: "center", justifyContent: "center" },
  avatarText: { color: palette.emerald, fontWeight: "800", fontSize: 18, fontFamily: fonts.serif },
  name: { fontFamily: fonts.serif, fontWeight: "700", fontSize: 15, color: palette.textPrimary },
  email: { color: palette.textMuted, fontSize: 12 },
  statsRow: { flexDirection: "row", gap: spacing.md },
  stat: { alignItems: "center" },
  statValue: { ...type.numeralSm, color: palette.goldOnLight },
  statLabel: { color: palette.textMuted, fontSize: 9, letterSpacing: 1, fontWeight: "700" },
  empty: { textAlign: "center", color: palette.textMuted, padding: spacing.xl },
});
