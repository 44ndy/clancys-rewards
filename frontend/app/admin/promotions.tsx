// Admin: promotions CRUD.
import { useCallback, useEffect, useState } from "react";
import { ActivityIndicator, FlatList, StyleSheet, Text, TouchableOpacity, View, Image } from "react-native";
import { useFocusEffect } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { palette, radii, spacing, fonts, shadow } from "@/src/lib/theme";
import { api, imageUrl, type Promotion } from "@/src/lib/api";
import { AdminScreen } from "@/src/components/AdminScreen";
import { Editor, type FieldDef } from "@/src/components/AdminEditor";

const FIELDS: FieldDef[] = [
  { key: "title", label: "Title", type: "text" },
  { key: "description", label: "Description", type: "multiline" },
  { key: "image_url", label: "Photo", type: "image", hint: "Fills the card on the guest home screen." },
  { key: "banner_color", label: "Banner color (hex)", type: "text" },
  { key: "push_on_publish", label: "Push notify on save", type: "switch" },
  { key: "active", label: "Active", type: "switch" },
];

const DEFAULT = { title: "", description: "", image_url: "", banner_color: "#0E5C3A", active: true, push_on_publish: false };

export default function AdminPromotions() {
  const [items, setItems] = useState<Promotion[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<Promotion | null>(null);
  const [creating, setCreating] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const load = useCallback(async () => {
    try { setItems(await api.adminListPromotions()); } catch (e) { console.log(e); }
  }, []);
  useEffect(() => { (async () => { setLoading(true); await load(); setLoading(false); })(); }, [load]);
  useFocusEffect(useCallback(() => { load(); }, [load]));

  const onSave = async (v: any) => {
    setSubmitting(true);
    try {
      if (editing) await api.adminUpdatePromotion(editing.promotion_id, v);
      else await api.adminCreatePromotion(v);
      setEditing(null); setCreating(false);
      await load();
    } catch (e) { console.log(e); }
    finally { setSubmitting(false); }
  };
  const onDelete = async (id: string) => { await api.adminDeletePromotion(id); await load(); };

  return (
    <AdminScreen
      title="Promotions"
      eyebrow="CAMPAIGNS"
      subtitle="Banners, seasonal events, push campaigns."
      action={
        <TouchableOpacity onPress={() => setCreating(true)} style={styles.addBtn} testID="add-promo">
          <Ionicons name="add" size={22} color={palette.surfaceDarker} />
        </TouchableOpacity>
      }
    >
      <FlatList
        data={items}
        keyExtractor={(p) => p.promotion_id}
        contentContainerStyle={{ gap: spacing.sm, paddingBottom: 120 }}
        ListEmptyComponent={loading ? <ActivityIndicator color={palette.gold} /> : <Text style={styles.empty}>No promotions yet.</Text>}
        renderItem={({ item }) => (
          <View style={[styles.card, shadow.soft]} testID={`admin-promo-${item.promotion_id}`}>
            {item.image_url ? (
              <Image source={{ uri: imageUrl(item.image_url) }} style={styles.banner} />
            ) : (
              <View style={[styles.banner, { backgroundColor: item.banner_color || palette.emerald }]} />
            )}
            <View style={styles.body}>
              <View style={styles.titleRow}>
                <Text style={styles.name}>{item.title}</Text>
                <View style={[styles.pill, { backgroundColor: item.active ? palette.success + "20" : palette.textMuted + "20" }]}>
                  <Text style={[styles.pillText, { color: item.active ? palette.success : palette.textMuted }]}>
                    {item.active ? "live" : "off"}
                  </Text>
                </View>
              </View>
              <Text style={styles.desc} numberOfLines={2}>{item.description}</Text>
              <View style={styles.actions}>
                <TouchableOpacity onPress={() => setEditing(item)} testID={`edit-promo-${item.promotion_id}`}>
                  <Ionicons name="create-outline" size={20} color={palette.emerald} />
                </TouchableOpacity>
                <TouchableOpacity onPress={() => onDelete(item.promotion_id)} testID={`delete-promo-${item.promotion_id}`}>
                  <Ionicons name="trash-outline" size={20} color={palette.error} />
                </TouchableOpacity>
              </View>
            </View>
          </View>
        )}
      />

      {(creating || editing) && (
        <Editor
          visible
          title={editing ? "Edit promotion" : "New promotion"}
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
  card: { backgroundColor: palette.surface, borderRadius: radii.lg, borderWidth: 1, borderColor: palette.border, overflow: "hidden" },
  banner: { width: "100%", height: 110 },
  body: { padding: spacing.md, gap: 4 },
  titleRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  name: { flex: 1, fontFamily: fonts.serif, fontWeight: "700", color: palette.textPrimary, fontSize: 16 },
  pill: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: radii.full },
  pillText: { fontSize: 10, fontWeight: "800", textTransform: "uppercase" },
  desc: { color: palette.textSecondary, fontSize: 13 },
  actions: { flexDirection: "row", gap: spacing.md, marginTop: spacing.sm },
  empty: { textAlign: "center", color: palette.textMuted, padding: spacing.xl },
});
