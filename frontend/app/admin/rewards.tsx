// Admin: rewards CRUD.
import { useCallback, useEffect, useState } from "react";
import { ActivityIndicator, FlatList, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { useFocusEffect } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { palette, radii, spacing, fonts, shadow , type } from "@/src/lib/theme";
import { api, type Reward } from "@/src/lib/api";
import { AdminScreen } from "@/src/components/AdminScreen";
import { Editor, type FieldDef } from "@/src/components/AdminEditor";

const FIELDS: FieldDef[] = [
  { key: "name", label: "Name", type: "text", placeholder: "Free Irish Coffee" },
  { key: "description", label: "Description", type: "multiline" },
  { key: "visits_required", label: "Visits required", type: "number" },
  { key: "reward_type", label: "Type", type: "select", options: [
    { label: "Dessert", value: "dessert" },
    { label: "Drink", value: "drink" },
    { label: "Tasting", value: "tasting" },
    { label: "Discount", value: "discount" },
    { label: "Exclusive", value: "exclusive" },
    { label: "Birthday", value: "birthday" },
  ]},
  { key: "value", label: "Display value", type: "text", placeholder: "Worth €8" },
  { key: "expires_days", label: "Expires in (days)", type: "number" },
  { key: "image_url", label: "Photo", type: "image", hint: "Optional - the medallion is used when empty." },
  { key: "active", label: "Active", type: "switch" },
];

const DEFAULT = { name: "", description: "", visits_required: 5, reward_type: "dessert",
  value: "", expires_days: 30, image_url: "", active: true };

export default function AdminRewards() {
  const [items, setItems] = useState<Reward[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<Reward | null>(null);
  const [creating, setCreating] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const load = useCallback(async () => {
    try { setItems(await api.adminListRewards()); } catch (e) { console.log(e); }
  }, []);
  useEffect(() => { (async () => { setLoading(true); await load(); setLoading(false); })(); }, [load]);
  useFocusEffect(useCallback(() => { load(); }, [load]));

  const onSave = async (v: any) => {
    setSubmitting(true);
    try {
      if (editing) await api.adminUpdateReward(editing.reward_id, v);
      else await api.adminCreateReward(v);
      setEditing(null); setCreating(false);
      await load();
    } catch (e) { console.log(e); }
    finally { setSubmitting(false); }
  };
  const onDelete = async (id: string) => { await api.adminDeleteReward(id); await load(); };

  return (
    <AdminScreen
      title="Rewards"
      eyebrow="LOYALTY"
      subtitle="Design the rewards your guests will chase."
      action={
        <TouchableOpacity onPress={() => setCreating(true)} style={styles.addBtn} testID="add-reward">
          <Ionicons name="add" size={22} color={palette.surfaceDarker} />
        </TouchableOpacity>
      }
    >
      <FlatList
        data={items}
        keyExtractor={(r) => r.reward_id}
        contentContainerStyle={{ gap: spacing.sm, paddingBottom: 120 }}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={loading ? <ActivityIndicator color={palette.gold} /> : <Text style={styles.empty}>No rewards yet.</Text>}
        renderItem={({ item }) => (
          <View style={[styles.card, shadow.soft]} testID={`admin-reward-${item.reward_id}`}>
            <View style={{ flex: 1 }}>
              <View style={styles.titleRow}>
                <Text style={styles.name}>{item.name}</Text>
                <View style={[styles.pill, { backgroundColor: item.active ? palette.success + "20" : palette.textMuted + "20" }]}>
                  <Text style={[styles.pillText, { color: item.active ? palette.success : palette.textMuted }]}>
                    {item.active ? "active" : "off"}
                  </Text>
                </View>
              </View>
              <Text style={styles.desc} numberOfLines={2}>{item.description}</Text>
              <Text style={styles.meta}>{item.visits_required} visits · {item.reward_type} · expires {item.expires_days}d</Text>
            </View>
            <View style={styles.cardActions}>
              <TouchableOpacity onPress={() => setEditing(item)} testID={`edit-reward-${item.reward_id}`}>
                <Ionicons name="create-outline" size={20} color={palette.emerald} />
              </TouchableOpacity>
              <TouchableOpacity onPress={() => onDelete(item.reward_id)} testID={`delete-reward-${item.reward_id}`}>
                <Ionicons name="trash-outline" size={20} color={palette.error} />
              </TouchableOpacity>
            </View>
          </View>
        )}
      />

      {(creating || editing) && (
        <Editor
          visible
          title={editing ? "Edit reward" : "New reward"}
          fields={FIELDS}
          initial={editing || DEFAULT}
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
  card: { flexDirection: "row", gap: spacing.md, padding: spacing.md, backgroundColor: palette.surface, borderRadius: radii.lg, borderWidth: 1, borderColor: palette.border, alignItems: "center" },
  titleRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  name: { fontFamily: fonts.serif, fontWeight: "700", color: palette.textPrimary, fontSize: 15, flex: 1 },
  pill: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: radii.full },
  pillText: { fontSize: 10, fontWeight: "800", textTransform: "uppercase" },
  desc: { color: palette.textSecondary, fontSize: 12, marginTop: 2 },
  meta: { ...type.label, color: palette.goldOnLight, letterSpacing: 0.3, marginTop: 4 },
  cardActions: { gap: spacing.sm },
  empty: { textAlign: "center", color: palette.textMuted, padding: spacing.xl },
});
