// Admin: staff management — owner only.
import { useCallback, useEffect, useState } from "react";
import { ActivityIndicator, FlatList, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { useFocusEffect } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { palette, radii, spacing, fonts, shadow } from "@/src/lib/theme";
import { api, type User } from "@/src/lib/api";
import { AdminScreen } from "@/src/components/AdminScreen";
import { Editor, type FieldDef } from "@/src/components/AdminEditor";

const NEW_FIELDS: FieldDef[] = [
  { key: "name", label: "Full name", type: "text" },
  { key: "email", label: "Email", type: "text" },
  { key: "password", label: "Initial password", type: "text" },
  { key: "role", label: "Role", type: "select", options: [
    { label: "Manager", value: "manager" },
    { label: "Host", value: "host" },
    { label: "Waiter", value: "waiter" },
  ]},
];
const EDIT_FIELDS: FieldDef[] = [
  { key: "name", label: "Full name", type: "text" },
  { key: "role", label: "Role", type: "select", options: [
    { label: "Manager", value: "manager" },
    { label: "Host", value: "host" },
    { label: "Waiter", value: "waiter" },
  ]},
  { key: "active", label: "Active", type: "switch" },
];

const ROLE_COLORS: Record<string, string> = {
  owner: palette.gold, manager: palette.emerald, host: palette.walnutLight, waiter: palette.success,
};

export default function AdminStaff() {
  const [items, setItems] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<User | null>(null);
  const [creating, setCreating] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const load = useCallback(async () => {
    try { setItems(await api.adminListStaff()); } catch (e) { console.log(e); }
  }, []);
  useEffect(() => { (async () => { setLoading(true); await load(); setLoading(false); })(); }, [load]);
  useFocusEffect(useCallback(() => { load(); }, [load]));

  const onSave = async (v: any) => {
    setSubmitting(true);
    try {
      if (editing) await api.adminUpdateStaff(editing.user_id, {
        name: v.name, role: v.role, active: v.active,
      });
      else await api.adminCreateStaff(v);
      setEditing(null); setCreating(false);
      await load();
    } catch (e: any) { console.log(e.message); }
    finally { setSubmitting(false); }
  };
  const onDisable = async (id: string) => { await api.adminDeleteStaff(id); await load(); };

  return (
    <AdminScreen
      title="Staff"
      eyebrow="OWNERS ROOM"
      subtitle="Invite, edit roles, and disable accounts."
      action={
        <TouchableOpacity onPress={() => setCreating(true)} style={styles.addBtn} testID="add-staff">
          <Ionicons name="person-add" size={20} color={palette.surfaceDarker} />
        </TouchableOpacity>
      }
    >
      <FlatList
        data={items}
        keyExtractor={(u) => u.user_id}
        contentContainerStyle={{ gap: spacing.sm, paddingBottom: 120 }}
        ListEmptyComponent={loading ? <ActivityIndicator color={palette.gold} /> : null}
        renderItem={({ item }) => (
          <View style={[styles.card, shadow.soft, !item.active && { opacity: 0.5 }]} testID={`staff-${item.user_id}`}>
            <View style={[styles.avatar, { borderColor: ROLE_COLORS[item.role] || palette.border }]}>
              <Text style={[styles.avatarText, { color: ROLE_COLORS[item.role] || palette.textPrimary }]}>
                {item.name.charAt(0).toUpperCase()}
              </Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.name}>{item.name}</Text>
              <Text style={styles.email}>{item.email}</Text>
              <View style={[styles.rolePill, { backgroundColor: (ROLE_COLORS[item.role] || palette.border) + "20" }]}>
                <Text style={[styles.roleText, { color: ROLE_COLORS[item.role] || palette.textPrimary }]}>{item.role}</Text>
              </View>
            </View>
            {item.role !== "owner" && (
              <View style={styles.actions}>
                <TouchableOpacity onPress={() => setEditing(item)} testID={`edit-staff-${item.user_id}`}>
                  <Ionicons name="create-outline" size={20} color={palette.emerald} />
                </TouchableOpacity>
                <TouchableOpacity onPress={() => onDisable(item.user_id)} testID={`disable-staff-${item.user_id}`}>
                  <Ionicons name="ban-outline" size={20} color={palette.error} />
                </TouchableOpacity>
              </View>
            )}
          </View>
        )}
      />

      {(creating || editing) && (
        <Editor
          visible
          title={editing ? "Edit staff" : "Invite staff"}
          fields={editing ? EDIT_FIELDS : NEW_FIELDS}
          initial={editing || { name: "", email: "", password: "", role: "waiter" }}
          onClose={() => { setEditing(null); setCreating(false); }}
          onSubmit={onSave}
          submitting={submitting}
        />
      )}
    </AdminScreen>
  );
}

const styles = StyleSheet.create({
  addBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: palette.gold, alignItems: "center", justifyContent: "center" },
  card: { flexDirection: "row", gap: spacing.md, padding: spacing.md, alignItems: "center", backgroundColor: palette.surface, borderRadius: radii.lg, borderWidth: 1, borderColor: palette.border },
  avatar: { width: 48, height: 48, borderRadius: 24, borderWidth: 2, alignItems: "center", justifyContent: "center", backgroundColor: palette.surfaceMuted },
  avatarText: { fontSize: 18, fontWeight: "800", fontFamily: fonts.serif },
  name: { fontFamily: fonts.serif, fontWeight: "700", fontSize: 15, color: palette.textPrimary },
  email: { color: palette.textMuted, fontSize: 12 },
  rolePill: { alignSelf: "flex-start", paddingHorizontal: 8, paddingVertical: 2, borderRadius: radii.full, marginTop: 4 },
  roleText: { fontSize: 10, fontWeight: "800", textTransform: "uppercase", letterSpacing: 0.5 },
  actions: { gap: spacing.sm },
});
