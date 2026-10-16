// Admin: menu CRUD.
import { useCallback, useEffect, useMemo, useState } from "react";
import { ActivityIndicator, FlatList, Image, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { useFocusEffect } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { palette, radii, spacing, fonts, shadow , type } from "@/src/lib/theme";
import { api, imageUrl, type MenuItem } from "@/src/lib/api";
import { AdminScreen } from "@/src/components/AdminScreen";
import { Editor, type FieldDef } from "@/src/components/AdminEditor";

// Services, matching the printed menu. Courses (Starters, Mains, Sides...) are
// free text per dish until the redesigned editor manages them properly.
const CATS = ["Breakfast", "Lunch", "Dinner", "Dessert"] as const;

const FIELDS: FieldDef[] = [
  { key: "name", label: "Name", type: "text" },
  { key: "description", label: "Description", type: "multiline" },
  { key: "category", label: "Category", type: "select", options: CATS.map((c) => ({ label: c, value: c })) },
  { key: "course", label: "Course (Starters, Mains, Sides…)", type: "text" },
  { key: "price", label: "Price (€)", type: "number" },
  { key: "image_url", label: "Photo", type: "image", hint: "Shown beside the dish on the guest menu." },
  { key: "order", label: "Sort order", type: "number" },
  { key: "available", label: "Available", type: "switch" },
];
const DEFAULT = { name: "", description: "", category: "Breakfast", course: "", price: 0, image_url: "", order: 0, available: true };

export default function AdminMenu() {
  const [items, setItems] = useState<MenuItem[]>([]);
  const [cat, setCat] = useState<string>("Breakfast");
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<MenuItem | null>(null);
  const [creating, setCreating] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const load = useCallback(async () => {
    try { setItems(await api.adminListMenu()); } catch (e) { console.log(e); }
  }, []);
  useEffect(() => { (async () => { setLoading(true); await load(); setLoading(false); })(); }, [load]);
  useFocusEffect(useCallback(() => { load(); }, [load]));

  const filtered = useMemo(() => items.filter((i) => i.category === cat), [items, cat]);

  const onSave = async (v: any) => {
    setSubmitting(true);
    try {
      if (editing) await api.adminUpdateMenu(editing.item_id, v);
      else await api.adminCreateMenu(v);
      setEditing(null); setCreating(false);
      await load();
    } catch (e) { console.log(e); }
    finally { setSubmitting(false); }
  };
  const onDelete = async (id: string) => { await api.adminDeleteMenu(id); await load(); };

  return (
    <AdminScreen
      title="Menu"
      eyebrow="THE KITCHEN"
      subtitle="Edit dishes, drinks, and house specials."
      action={
        <TouchableOpacity onPress={() => setCreating(true)} style={styles.addBtn} testID="add-menu">
          <Ionicons name="add" size={22} color={palette.surfaceDarker} />
        </TouchableOpacity>
      }
    >
      <View style={styles.catRow}>
        {CATS.map((c) => {
          const active = c === cat;
          return (
            <TouchableOpacity
              key={c} onPress={() => setCat(c)}
              style={[styles.catChip, active && styles.catChipActive]}
              testID={`menu-cat-${c}`}
            >
              <Text style={[styles.catText, active && styles.catTextActive]}>{c}</Text>
            </TouchableOpacity>
          );
        })}
      </View>

      <FlatList
        data={filtered}
        keyExtractor={(i) => i.item_id}
        contentContainerStyle={{ gap: spacing.sm, paddingBottom: 120, marginTop: spacing.sm }}
        ListEmptyComponent={loading ? <ActivityIndicator color={palette.gold} /> : <Text style={styles.empty}>No items in {cat}.</Text>}
        renderItem={({ item }) => (
          <View style={[styles.card, shadow.soft]} testID={`admin-menu-${item.item_id}`}>
            {item.image_url ? (
              <Image source={{ uri: imageUrl(item.image_url) }} style={styles.img} />
            ) : (
              <View style={[styles.img, { backgroundColor: palette.surfaceMuted }]} />
            )}
            <View style={{ flex: 1 }}>
              <View style={styles.titleRow}>
                <Text style={styles.name}>{item.name}</Text>
                {!item.available && (
                  <View style={styles.offPill}><Text style={styles.offText}>off</Text></View>
                )}
              </View>
              <Text style={styles.desc} numberOfLines={1}>{item.description}</Text>
              <Text style={styles.price}>€{item.price.toFixed(2)}</Text>
            </View>
            <View style={styles.actions}>
              <TouchableOpacity onPress={() => setEditing(item)} testID={`edit-menu-${item.item_id}`}>
                <Ionicons name="create-outline" size={20} color={palette.emerald} />
              </TouchableOpacity>
              <TouchableOpacity onPress={() => onDelete(item.item_id)} testID={`delete-menu-${item.item_id}`}>
                <Ionicons name="trash-outline" size={20} color={palette.error} />
              </TouchableOpacity>
            </View>
          </View>
        )}
      />

      {(creating || editing) && (
        <Editor
          visible
          title={editing ? "Edit dish" : "New dish"}
          fields={FIELDS}
          initial={editing || { ...DEFAULT, category: cat }}
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
  catRow: { flexDirection: "row", flexWrap: "wrap", gap: 6 },
  catChip: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: radii.full, backgroundColor: palette.surface, borderWidth: 1, borderColor: palette.border },
  catChipActive: { backgroundColor: palette.surfaceDarker, borderColor: palette.gold },
  catText: { color: palette.textPrimary, fontSize: 12, fontWeight: "600" },
  catTextActive: { color: palette.gold },
  card: { flexDirection: "row", gap: spacing.sm, padding: spacing.sm, backgroundColor: palette.surface, borderRadius: radii.lg, borderWidth: 1, borderColor: palette.border, alignItems: "center" },
  img: { width: 60, height: 60, borderRadius: radii.md },
  titleRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  name: { flex: 1, fontFamily: fonts.serif, fontWeight: "700", fontSize: 14, color: palette.textPrimary },
  desc: { color: palette.textMuted, fontSize: 12 },
  price: { ...type.mono, color: palette.goldOnLight, marginTop: 2 },
  offPill: { paddingHorizontal: 6, paddingVertical: 1, borderRadius: 8, backgroundColor: palette.textMuted + "20" },
  offText: { color: palette.textMuted, fontSize: 9, fontWeight: "800", textTransform: "uppercase" },
  actions: { gap: spacing.sm },
  empty: { textAlign: "center", color: palette.textMuted, padding: spacing.xl },
});
