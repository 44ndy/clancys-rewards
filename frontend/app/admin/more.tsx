// More — entry point to less-frequent admin sections.
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";

import { palette, radii, spacing, fonts, shadow } from "@/src/lib/theme";
import { useAuth } from "@/src/state/auth";
import { AdminScreen } from "@/src/components/AdminScreen";

export default function AdminMore() {
  const router = useRouter();
  const { user, signOut } = useAuth();
  const isOwner = user?.role === "owner";

  const items: { icon: any; label: string; path: any; owner?: boolean; color: string }[] = [
    { icon: "ribbon-outline", label: "Rewards", path: "/admin/rewards", color: palette.goldOnLight },
    { icon: "megaphone-outline", label: "Promotions", path: "/admin/promotions", color: palette.emerald },
    { icon: "restaurant-outline", label: "Menu", path: "/admin/menu", color: palette.walnutLight },
    { icon: "people-outline", label: "Customers", path: "/admin/customers", color: palette.success },
    { icon: "person-add-outline", label: "Staff", path: "/admin/staff", owner: true, color: palette.error },
  ];

  return (
    <AdminScreen title="More tools" eyebrow="ADMIN" subtitle={`Signed in as ${user?.name} · ${user?.role}`}>
      <ScrollView contentContainerStyle={{ gap: spacing.sm }}>
        {items.filter((i) => !i.owner || isOwner).map((it) => (
          <TouchableOpacity
            key={it.label}
            style={[styles.row, shadow.soft]}
            onPress={() => router.push(it.path)}
            testID={`more-${it.label.toLowerCase()}`}
          >
            <View style={[styles.iconBox, { backgroundColor: it.color + "20" }]}>
              <Ionicons name={it.icon} size={22} color={it.color} />
            </View>
            <Text style={styles.label}>{it.label}</Text>
            <Ionicons name="chevron-forward" size={20} color={palette.textMuted} />
          </TouchableOpacity>
        ))}

        <TouchableOpacity style={styles.logout} onPress={signOut} testID="admin-logout">
          <Ionicons name="log-out-outline" size={18} color={palette.error} />
          <Text style={styles.logoutText}>Sign out</Text>
        </TouchableOpacity>
      </ScrollView>
    </AdminScreen>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: "row", alignItems: "center", gap: spacing.md, padding: spacing.md, backgroundColor: palette.surface, borderRadius: radii.lg, borderWidth: 1, borderColor: palette.border },
  iconBox: { width: 44, height: 44, borderRadius: 22, alignItems: "center", justifyContent: "center" },
  label: { flex: 1, color: palette.textPrimary, fontWeight: "700", fontSize: 15, fontFamily: fonts.serif },
  logout: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, marginTop: spacing.xl, paddingVertical: 14, borderWidth: 1, borderColor: "#FAD7DC", borderRadius: radii.full, backgroundColor: "#FCE9EB" },
  logoutText: { color: palette.error, fontWeight: "700" },
});
