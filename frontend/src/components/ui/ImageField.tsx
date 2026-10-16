// Pick a photo and put it on the restaurant's own server.
//
// The owner is standing in the pub with the dish in front of them, so the
// interaction is: tap, pick, done. No URL to paste, no file manager, no
// hosting to arrange. The upload happens on pick rather than on save, because
// a photo that only uploads when the form is submitted leaves you staring at a
// spinner wondering which of the two things failed.
//
// What is stored is the path the API returns, never an absolute URL: the same
// row has to keep working when the backend answers to localhost today, a LAN
// address this evening, and a real host later.

import { useState } from "react";
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from "react-native";
import { Image } from "expo-image";
import * as ImagePicker from "expo-image-picker";
import { Ionicons } from "@expo/vector-icons";

import { palette, radii, spacing, type } from "@/src/lib/theme";
import { api, imageUrl } from "@/src/lib/api";

export function ImageField({
  value,
  onChange,
  hint,
  testID,
}: {
  value?: string | null;
  onChange: (path: string | null) => void;
  hint?: string;
  testID?: string;
}) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const pick = async () => {
    setError(null);
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) {
      setError(
        perm.canAskAgain
          ? "Photo access is needed to choose a picture."
          : "Photo access is off for Clancy's. Turn it on in Settings.",
      );
      return;
    }
    const picked = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      allowsEditing: true,
      // Dishes and promos both read best as a wide plate.
      aspect: [4, 3],
      quality: 0.85,
    });
    if (picked.canceled || !picked.assets?.length) return;

    const asset = picked.assets[0];
    setBusy(true);
    try {
      const r = await api.adminUploadImage(asset.uri, asset.fileName || "photo.jpg");
      onChange(r.url);
    } catch (e: any) {
      setError(e?.message || "That didn't upload. Try again.");
    } finally {
      setBusy(false);
    }
  };

  const src = imageUrl(value);

  return (
    <View style={styles.wrap} testID={testID}>
      <Pressable
        onPress={pick}
        disabled={busy}
        style={styles.plate}
        accessibilityRole="button"
        accessibilityLabel={src ? "Change photo" : "Add a photo"}
        testID={testID ? `${testID}-pick` : undefined}
      >
        {src ? (
          <Image source={{ uri: src }} style={StyleSheet.absoluteFill} contentFit="cover" transition={180} />
        ) : null}
        {busy ? (
          <View style={styles.veil}>
            <ActivityIndicator color={palette.gold} />
            <Text style={styles.veilText}>Uploading…</Text>
          </View>
        ) : !src ? (
          <View style={styles.empty}>
            <Ionicons name="camera-outline" size={26} color={palette.goldOnLight} />
            <Text style={styles.emptyText}>Add a photo</Text>
            {hint ? <Text style={styles.hint}>{hint}</Text> : null}
          </View>
        ) : null}
      </Pressable>

      <View style={styles.actions}>
        <Pressable onPress={pick} disabled={busy} style={styles.action} accessibilityRole="button">
          <Ionicons name="image-outline" size={16} color={palette.textPrimary} />
          <Text style={styles.actionText}>{src ? "Replace" : "Choose"}</Text>
        </Pressable>
        {src ? (
          <Pressable
            onPress={() => onChange(null)}
            disabled={busy}
            style={styles.action}
            accessibilityRole="button"
            testID={testID ? `${testID}-remove` : undefined}
          >
            <Ionicons name="trash-outline" size={16} color={palette.error} />
            <Text style={[styles.actionText, { color: palette.error }]}>Remove</Text>
          </Pressable>
        ) : null}
      </View>

      {error ? <Text style={styles.error}>{error}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: spacing.sm },
  plate: {
    aspectRatio: 4 / 3,
    borderRadius: radii.lg,
    overflow: "hidden",
    backgroundColor: palette.canvas,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: palette.border,
    alignItems: "center",
    justifyContent: "center",
  },
  empty: { alignItems: "center", gap: 6, paddingHorizontal: spacing.lg },
  emptyText: { ...type.strong, color: palette.textPrimary },
  hint: { ...type.bodySm, color: palette.textMuted, textAlign: "center" },
  veil: {
    ...StyleSheet.absoluteFillObject,
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: "rgba(11,8,5,0.55)",
  },
  veilText: { ...type.bodySm, color: palette.ivory },

  actions: { flexDirection: "row", gap: spacing.sm },
  action: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 7,
    minHeight: 48,
    flex: 1,
    borderRadius: radii.md,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: palette.border,
    backgroundColor: palette.canvas,
  },
  actionText: { ...type.buttonSm, color: palette.textPrimary },
  error: { ...type.bodySm, color: palette.error },
});
