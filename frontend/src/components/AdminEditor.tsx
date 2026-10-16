// Generic editor modal used by Rewards / Promotions / Menu / Staff admin screens.
import { useState } from "react";
import {
  ActivityIndicator, KeyboardAvoidingView, Modal, Platform, Pressable, ScrollView,
  StyleSheet, Text, TextInput, TouchableOpacity, View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";

import { palette, radii, spacing, fonts } from "@/src/lib/theme";
import { ImageField } from "@/src/components/ui/ImageField";

export type FieldDef =
  | { key: string; label: string; type: "text" | "multiline" | "number"; placeholder?: string }
  | { key: string; label: string; type: "select"; options: { label: string; value: string }[] }
  | { key: string; label: string; type: "switch" }
  | { key: string; label: string; type: "image"; hint?: string };

export function Editor({
  visible, title, fields, initial, onClose, onSubmit, submitting,
}: {
  visible: boolean; title: string; fields: FieldDef[]; initial: Record<string, any>;
  onClose: () => void; onSubmit: (v: Record<string, any>) => Promise<void>; submitting?: boolean;
}) {
  const [values, setValues] = useState<Record<string, any>>(initial);
  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.backdrop}>
        {/* The dimmed area above the sheet closes it, and Android's system Back
            closes it through onRequestClose. Before, neither did: the only exit
            was a 24pt glyph. The scrim is a sibling of the sheet rather than its
            parent, so no press has to be stopped from propagating. */}
        <Pressable style={styles.scrim} onPress={onClose} accessibilityLabel="Close editor" />
        <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined}>
          <View style={styles.sheet}>
            <View style={styles.handle} />
            <View style={styles.header}>
              <Text style={styles.title}>{title}</Text>
              <TouchableOpacity onPress={onClose} testID="editor-close">
                <Ionicons name="close" size={24} color={palette.textPrimary} />
              </TouchableOpacity>
            </View>
            <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
              {fields.map((f) => (
                <View key={f.key} style={styles.field}>
                  <Text style={styles.label}>{f.label.toUpperCase()}</Text>
                  {f.type === "image" ? (
                    <ImageField
                      value={values[f.key]}
                      onChange={(url) => setValues((v) => ({ ...v, [f.key]: url }))}
                      hint={f.hint}
                      testID={`editor-image-${f.key}`}
                    />
                  ) : f.type === "select" ? (
                    <View style={styles.chipRow}>
                      {f.options.map((o) => {
                        const active = String(values[f.key]) === String(o.value);
                        return (
                          <TouchableOpacity
                            key={o.value}
                            onPress={() => setValues((v) => ({ ...v, [f.key]: o.value }))}
                            style={[styles.chip, active && styles.chipActive]}
                          >
                            <Text style={[styles.chipText, active && styles.chipTextActive]}>{o.label}</Text>
                          </TouchableOpacity>
                        );
                      })}
                    </View>
                  ) : f.type === "switch" ? (
                    <TouchableOpacity
                      onPress={() => setValues((v) => ({ ...v, [f.key]: !v[f.key] }))}
                      style={[styles.toggle, values[f.key] && styles.toggleOn]}
                    >
                      <Text style={[styles.toggleText, values[f.key] && { color: palette.surfaceDarker }]}>
                        {values[f.key] ? "ENABLED" : "DISABLED"}
                      </Text>
                    </TouchableOpacity>
                  ) : (
                    <TextInput
                      style={[styles.input, f.type === "multiline" && { minHeight: 80, textAlignVertical: "top" }]}
                      value={values[f.key] != null ? String(values[f.key]) : ""}
                      onChangeText={(t) => setValues((v) => ({
                        ...v,
                        [f.key]: f.type === "number" ? Number(t.replace(/[^0-9.]/g, "")) || 0 : t,
                      }))}
                      placeholder={f.placeholder}
                      placeholderTextColor={palette.textMuted}
                      multiline={f.type === "multiline"}
                      keyboardType={f.type === "number" ? "decimal-pad" : "default"}
                    />
                  )}
                </View>
              ))}
              <TouchableOpacity
                style={styles.submit}
                onPress={() => onSubmit(values)}
                disabled={submitting}
                testID="editor-submit"
              >
                {submitting ? <ActivityIndicator color={palette.surfaceDarker} /> : (
                  <Text style={styles.submitText}>Save</Text>
                )}
              </TouchableOpacity>
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: "rgba(11,8,5,0.55)", justifyContent: "flex-end" },
  scrim: { flex: 1 },
  sheet: { backgroundColor: palette.surface, borderTopLeftRadius: 28, borderTopRightRadius: 28, maxHeight: "92%", paddingBottom: 32 },
  handle: { width: 36, height: 4, backgroundColor: palette.border, alignSelf: "center", marginTop: 12, borderRadius: 2 },
  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", padding: spacing.lg, paddingBottom: 0 },
  title: { fontFamily: fonts.serif, fontSize: 22, fontWeight: "700", color: palette.textPrimary },
  scroll: { padding: spacing.lg, paddingTop: spacing.md, gap: spacing.md },
  field: { gap: 6 },
  label: { fontSize: 10, color: palette.textMuted, letterSpacing: 1.5, fontWeight: "700" },
  input: { borderWidth: 1, borderColor: palette.border, padding: 12, borderRadius: radii.md, fontSize: 14, color: palette.textPrimary, backgroundColor: palette.canvas },
  chipRow: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  chip: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: radii.full, borderWidth: 1, borderColor: palette.border, backgroundColor: palette.canvas },
  chipActive: { backgroundColor: palette.emerald, borderColor: palette.emerald },
  chipText: { color: palette.textPrimary, fontWeight: "600", fontSize: 12 },
  chipTextActive: { color: palette.ivory },
  toggle: { paddingVertical: 12, alignItems: "center", borderRadius: radii.full, backgroundColor: palette.canvas, borderWidth: 1, borderColor: palette.border },
  toggleOn: { backgroundColor: palette.gold, borderColor: palette.gold },
  toggleText: { fontWeight: "700", letterSpacing: 1, color: palette.textMuted },
  submit: { backgroundColor: palette.gold, paddingVertical: 16, borderRadius: radii.full, alignItems: "center", marginTop: spacing.md },
  submitText: { color: palette.surfaceDarker, fontWeight: "800", fontSize: 15, letterSpacing: 0.5 },
});
