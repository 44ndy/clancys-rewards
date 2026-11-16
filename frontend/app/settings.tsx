// Account settings — the guest (or anyone on staff) edits their own details,
// changes their password and finds the house's legal pages.
//
// Reached from the avatar on Home, the gear on Profile, the staff scanner's
// header and More in the admin. It sits on the root stack so every role
// shares the one screen.

import { useEffect, useState } from "react";
import {
  Image,
  KeyboardAvoidingView,
  Linking,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import * as WebBrowser from "expo-web-browser";
import Constants from "expo-constants";

import { gradients, palette, radii, spacing, type } from "@/src/lib/theme";
import { api, legalUrl, type ProfileUpdate } from "@/src/lib/api";
import { useAuth } from "@/src/state/auth";
import { Button } from "@/src/components/ui/Button";
import { Grain } from "@/src/components/ui/Grain";
import { PressableScale } from "@/src/components/ui/PressableScale";
import { Surface } from "@/src/components/ui/Surface";

type Note = { ok: boolean; text: string } | null;

const EMAIL_OK = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default function Settings() {
  const router = useRouter();
  const { user, loading, refresh } = useAuth();
  const isGoogle = user?.auth_provider === "google";

  // ── Your details ───────────────────────────────────────────────────────────
  const [name, setName] = useState(user?.name ?? "");
  const [email, setEmail] = useState(user?.email ?? "");
  const [phone, setPhone] = useState(user?.phone ?? "");
  const [emailPassword, setEmailPassword] = useState("");
  const [saving, setSaving] = useState(false);
  const [detailsNote, setDetailsNote] = useState<Note>(null);

  // ── Password ───────────────────────────────────────────────────────────────
  const [currentPw, setCurrentPw] = useState("");
  const [newPw, setNewPw] = useState("");
  const [confirmPw, setConfirmPw] = useState("");
  const [pwBusy, setPwBusy] = useState(false);
  const [pwNote, setPwNote] = useState<Note>(null);

  const [focus, setFocus] = useState<string | null>(null);

  // Signed out (or never signed in): nothing to edit here. Wait for the stored
  // session to load first, or a cold start straight onto this screen bounces.
  useEffect(() => {
    if (!loading && !user) router.replace("/");
  }, [loading, user, router]);

  // A different account on the same phone starts from its own details.
  const uid = user?.user_id;
  useEffect(() => {
    if (!user) return;
    setName(user.name);
    setEmail(user.email);
    setPhone(user.phone ?? "");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [uid]);

  if (!user) return null;

  const cleanEmail = email.trim().toLowerCase();
  const emailChanged = !isGoogle && cleanEmail !== user.email.toLowerCase();
  const nameChanged = name.trim() !== user.name;
  const phoneChanged = phone.trim() !== (user.phone ?? "");
  const dirty = nameChanged || emailChanged || phoneChanged;

  async function saveDetails() {
    setDetailsNote(null);
    if (!name.trim()) return setDetailsNote({ ok: false, text: "Your name can't be empty." });
    if (emailChanged && !EMAIL_OK.test(cleanEmail))
      return setDetailsNote({ ok: false, text: "That email doesn't look right." });
    if (emailChanged && !emailPassword)
      return setDetailsNote({ ok: false, text: "Enter your current password to change your email." });

    const body: ProfileUpdate = {};
    if (nameChanged) body.name = name.trim();
    if (phoneChanged) body.phone = phone.trim();
    if (emailChanged) {
      body.email = cleanEmail;
      body.current_password = emailPassword;
    }
    setSaving(true);
    try {
      const updated = await api.updateMe(body);
      await refresh();
      setName(updated.name);
      setEmail(updated.email);
      setPhone(updated.phone ?? "");
      setEmailPassword("");
      setDetailsNote({ ok: true, text: "Your details are saved." });
    } catch (e: any) {
      setDetailsNote({ ok: false, text: friendly(e?.message) });
    } finally {
      setSaving(false);
    }
  }

  async function savePassword() {
    setPwNote(null);
    if (!currentPw) return setPwNote({ ok: false, text: "Enter your current password." });
    if (newPw.length < 8) return setPwNote({ ok: false, text: "The new password needs at least 8 characters." });
    if (newPw !== confirmPw) return setPwNote({ ok: false, text: "The two new passwords don't match." });
    setPwBusy(true);
    try {
      await api.changePassword(currentPw, newPw);
      setCurrentPw("");
      setNewPw("");
      setConfirmPw("");
      setPwNote({ ok: true, text: "Password updated. Use it next time you sign in." });
    } catch (e: any) {
      setPwNote({ ok: false, text: friendly(e?.message) });
    } finally {
      setPwBusy(false);
    }
  }

  const openPage = (page: "privacy" | "terms") => {
    WebBrowser.openBrowserAsync(legalUrl(page)).catch(() => Linking.openURL(legalUrl(page)));
  };

  const version = Constants.expoConfig?.version ?? "1.0.0";

  return (
    <View style={styles.root}>
      {/* ── Header ───────────────────────────────────────────────────────── */}
      <View style={styles.hero}>
        <LinearGradient colors={gradients.walnut} style={StyleSheet.absoluteFill} />
        <Grain opacity={0.08} />
        <SafeAreaView edges={["top"]}>
          <View style={styles.heroBar}>
            <PressableScale
              onPress={() => (router.canGoBack() ? router.back() : router.replace("/"))}
              style={styles.back}
              accessibilityRole="button"
              accessibilityLabel="Back"
              testID="settings-back"
            >
              <Ionicons name="chevron-back" size={22} color={palette.ivory} />
            </PressableScale>
          </View>
          <View style={styles.heroRow}>
            <View style={{ flex: 1 }}>
              <Text style={styles.eyebrow}>YOUR ACCOUNT</Text>
              <Text style={styles.title}>Settings</Text>
            </View>
            <View style={styles.avatar}>
              {user.picture ? (
                <Image source={{ uri: user.picture }} style={styles.avatarImg} />
              ) : (
                <Text style={styles.avatarText}>{user.name.charAt(0).toUpperCase()}</Text>
              )}
            </View>
          </View>
        </SafeAreaView>
      </View>

      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
        <ScrollView
          contentContainerStyle={styles.scroll}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* ── Your details ─────────────────────────────────────────────── */}
          <Section title="Your details">
            <Field
              label="Name"
              value={name}
              onChangeText={setName}
              autoCapitalize="words"
              autoComplete="name"
              focused={focus === "name"}
              onFocus={() => setFocus("name")}
              onBlur={() => setFocus(null)}
              testID="settings-name"
            />
            <Field
              label="Email"
              value={email}
              onChangeText={setEmail}
              editable={!isGoogle}
              keyboardType="email-address"
              autoCapitalize="none"
              autoComplete="email"
              focused={focus === "email"}
              onFocus={() => setFocus("email")}
              onBlur={() => setFocus(null)}
              hint={
                isGoogle
                  ? "You sign in with Google, so this email is managed by your Google account."
                  : undefined
              }
              testID="settings-email"
            />
            {emailChanged ? (
              <Field
                label="Current password"
                value={emailPassword}
                onChangeText={setEmailPassword}
                secureTextEntry
                autoCapitalize="none"
                focused={focus === "emailPw"}
                onFocus={() => setFocus("emailPw")}
                onBlur={() => setFocus(null)}
                hint="Needed to change the email you sign in with."
                testID="settings-email-password"
              />
            ) : null}
            <Field
              label="Phone (optional)"
              value={phone}
              onChangeText={setPhone}
              keyboardType="phone-pad"
              autoComplete="tel"
              placeholder="+353 87 123 4567"
              focused={focus === "phone"}
              onFocus={() => setFocus("phone")}
              onBlur={() => setFocus(null)}
              testID="settings-phone"
            />
            <NoteLine note={detailsNote} testID="settings-details-note" />
            <Button
              label="Save changes"
              variant="emerald"
              onPress={saveDetails}
              loading={saving}
              disabled={!dirty}
              testID="settings-save"
            />
          </Section>

          {/* ── Password ─────────────────────────────────────────────────── */}
          {isGoogle ? null : (
            <Section title="Password">
              <Field
                label="Current password"
                value={currentPw}
                onChangeText={setCurrentPw}
                secureTextEntry
                autoCapitalize="none"
                focused={focus === "cur"}
                onFocus={() => setFocus("cur")}
                onBlur={() => setFocus(null)}
                testID="settings-current-password"
              />
              <Field
                label="New password"
                value={newPw}
                onChangeText={setNewPw}
                secureTextEntry
                autoCapitalize="none"
                hint="At least 8 characters."
                focused={focus === "new"}
                onFocus={() => setFocus("new")}
                onBlur={() => setFocus(null)}
                testID="settings-new-password"
              />
              <Field
                label="Repeat new password"
                value={confirmPw}
                onChangeText={setConfirmPw}
                secureTextEntry
                autoCapitalize="none"
                focused={focus === "confirm"}
                onFocus={() => setFocus("confirm")}
                onBlur={() => setFocus(null)}
                testID="settings-confirm-password"
              />
              <NoteLine note={pwNote} testID="settings-password-note" />
              <Button
                label="Update password"
                variant="ghostLight"
                onPress={savePassword}
                loading={pwBusy}
                disabled={!currentPw || !newPw || !confirmPw}
                testID="settings-password-save"
              />
            </Section>
          )}

          {/* ── App ──────────────────────────────────────────────────────── */}
          <Section title="App" flush>
            {Platform.OS !== "web" ? (
              <Row
                icon="notifications-outline"
                label="Notifications"
                detail="Turn alerts on or off in your phone's settings"
                onPress={() => Linking.openSettings()}
                testID="settings-notifications"
              />
            ) : null}
            <Row
              icon="shield-checkmark-outline"
              label="Privacy policy"
              onPress={() => openPage("privacy")}
              testID="settings-privacy"
            />
            <Row
              icon="document-text-outline"
              label="Terms of use"
              onPress={() => openPage("terms")}
              last
              testID="settings-terms"
            />
          </Section>

          <Text style={styles.version}>Clancy&apos;s Rewards · version {version}</Text>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

/** Server messages are already short and in English; this only covers the network. */
function friendly(msg?: string) {
  if (!msg) return "Something went wrong. Please try again.";
  if (/network request failed|failed to fetch/i.test(msg)) return "No connection. Check your internet and try again.";
  if (/^HTTP 5/.test(msg)) return "The server had a problem. Please try again in a moment.";
  return msg.endsWith(".") ? msg : `${msg}.`;
}

function Section({ title, children, flush }: { title: string; children: React.ReactNode; flush?: boolean }) {
  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>{title}</Text>
      <Surface bezelPad={4} radius={radii.xl} depth="hairline">
        <View style={flush ? undefined : styles.sectionBody}>{children}</View>
      </Surface>
    </View>
  );
}

function Field({
  label,
  hint,
  focused,
  editable = true,
  ...input
}: React.ComponentProps<typeof TextInput> & { label: string; hint?: string; focused?: boolean }) {
  return (
    <View style={styles.field}>
      <Text style={[styles.fieldLabel, focused && { color: palette.goldOnLight }]}>{label}</Text>
      <TextInput
        {...input}
        editable={editable}
        accessibilityLabel={label}
        style={[styles.input, focused && styles.inputFocused, !editable && styles.inputLocked]}
        placeholderTextColor={palette.textMuted}
      />
      {hint ? <Text style={styles.hint}>{hint}</Text> : null}
    </View>
  );
}

function NoteLine({ note, testID }: { note: Note; testID?: string }) {
  if (!note) return null;
  return (
    <View style={[styles.note, note.ok ? styles.noteOk : styles.noteBad]} testID={testID}>
      <Ionicons
        name={note.ok ? "checkmark-circle" : "alert-circle"}
        size={17}
        color={note.ok ? palette.success : palette.error}
      />
      <Text style={[styles.noteText, { color: note.ok ? palette.success : palette.error }]}>{note.text}</Text>
    </View>
  );
}

function Row({
  icon,
  label,
  detail,
  onPress,
  last,
  testID,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  detail?: string;
  onPress: () => void;
  last?: boolean;
  testID?: string;
}) {
  return (
    <PressableScale
      onPress={onPress}
      testID={testID}
      accessibilityRole="button"
      accessibilityLabel={label}
      style={[styles.row, last && { borderBottomWidth: 0 }]}
    >
      <View style={styles.rowIcon}>
        <Ionicons name={icon} size={18} color={palette.emerald} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={styles.rowLabel}>{label}</Text>
        {detail ? <Text style={styles.rowDetail}>{detail}</Text> : null}
      </View>
      <Ionicons name="open-outline" size={16} color={palette.textMuted} />
    </PressableScale>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: palette.canvas },

  hero: { overflow: "hidden", borderBottomLeftRadius: radii.xxl, borderBottomRightRadius: radii.xxl },
  heroBar: { paddingHorizontal: spacing.md, paddingTop: spacing.xs },
  back: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(11,8,5,0.35)",
  },
  heroRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.lg,
    paddingTop: spacing.xs,
  },
  eyebrow: { ...type.eyebrow, fontSize: 10, color: palette.gold },
  title: { ...type.h1, color: palette.ivory, marginTop: 5 },
  avatar: {
    width: 54,
    height: 54,
    borderRadius: 27,
    backgroundColor: "rgba(11,8,5,0.5)",
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: palette.borderGold,
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  avatarImg: { width: 54, height: 54 },
  avatarText: { ...type.h2, color: palette.ivory },

  scroll: { paddingHorizontal: spacing.lg, paddingBottom: 60 },
  section: { marginTop: spacing.lg },
  sectionTitle: { ...type.eyebrow, textTransform: "uppercase", fontSize: 10.5, color: palette.goldOnLight, marginBottom: spacing.sm, marginLeft: 4 },
  sectionBody: { padding: spacing.md, gap: spacing.md },

  field: { gap: 6 },
  fieldLabel: { ...type.label, color: palette.textSecondary },
  input: {
    ...type.body,
    fontSize: 16,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: palette.border,
    backgroundColor: palette.surface,
    paddingHorizontal: spacing.md,
    paddingVertical: 13,
    borderRadius: radii.md,
    color: palette.textPrimary,
  },
  inputFocused: { borderColor: palette.goldOnLight, backgroundColor: palette.surfaceRaised },
  inputLocked: { backgroundColor: palette.canvas, color: palette.textSecondary },
  hint: { ...type.bodySm, fontSize: 12, color: palette.textMuted },

  note: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: spacing.md,
    paddingVertical: 10,
    borderRadius: radii.md,
  },
  noteOk: { backgroundColor: "rgba(46,107,57,0.09)" },
  noteBad: { backgroundColor: palette.errorSurface },
  noteText: { ...type.bodySm, flex: 1 },

  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    paddingHorizontal: spacing.md,
    paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: palette.border,
  },
  rowIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "rgba(14,92,58,0.10)",
    alignItems: "center",
    justifyContent: "center",
  },
  rowLabel: { ...type.bodyMedium, color: palette.textPrimary },
  rowDetail: { ...type.bodySm, fontSize: 12, color: palette.textMuted, marginTop: 1 },

  version: { ...type.bodySm, fontSize: 11.5, color: palette.textMuted, textAlign: "center", marginTop: spacing.lg },
});
