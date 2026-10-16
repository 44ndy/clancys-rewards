// Sign in / join, shared by both auth routes.
//
// Errors sit directly above the button that triggers them rather than at the top
// of the form — on a phone the top of the form is often behind the keyboard by the
// time you submit, and an error you cannot see is an error that did not happen.

import { useState } from "react";
import {
  Image,
  KeyboardAvoidingView,
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
import Animated, { FadeInDown, ReduceMotion } from "react-native-reanimated";

import { gradients, palette, radii, spacing, type } from "@/src/lib/theme";
import { useAuth } from "@/src/state/auth";
import { Button } from "@/src/components/ui/Button";
import { Grain } from "@/src/components/ui/Grain";
import { PressableScale } from "@/src/components/ui/PressableScale";

type Mode = "login" | "register";

const enter = (d: number) =>
  FadeInDown.delay(d).duration(420).reduceMotion(ReduceMotion.System);

export function AuthForm({ mode }: { mode: Mode }) {
  const router = useRouter();
  const { signIn, signUp, signInWithGoogle, googleReady, googleError, clearGoogleError } = useAuth();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [focused, setFocused] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // A Google redirect that came back broken lands here rather than vanishing.
  const shownError = error ?? googleError;

  const isLogin = mode === "login";

  const submit = async () => {
    setError(null);
    clearGoogleError();
    if (!email.trim() || !password) {
      setError("Enter your email and password.");
      return;
    }
    if (!isLogin && !name.trim()) {
      setError("Tell us your name.");
      return;
    }
    if (!isLogin && password.length < 6) {
      setError("Passwords need at least 6 characters.");
      return;
    }
    setSubmitting(true);
    try {
      if (isLogin) await signIn(email.trim(), password);
      else await signUp(email.trim(), password, name.trim());
      router.replace("/");
    } catch (e: any) {
      setError(e?.message || "Something went wrong. Try again.");
    } finally {
      setSubmitting(false);
    }
  };

  const google = async () => {
    setError(null);
    clearGoogleError();
    setSubmitting(true);
    try {
      await signInWithGoogle();
      router.replace("/");
    } catch (e: any) {
      setError(e?.message || "Google sign-in failed.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <View style={styles.root}>
      <LinearGradient colors={gradients.walnut} style={styles.canopy} />
      <Grain opacity={0.07} style={styles.canopyGrain} />

      <SafeAreaView style={{ flex: 1 }} edges={["top", "bottom"]}>
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : undefined}
          style={{ flex: 1 }}
        >
          <ScrollView
            contentContainerStyle={styles.scroll}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            <PressableScale onPress={() => router.back()} style={styles.back} testID="auth-back">
              <Ionicons name="chevron-back" size={22} color={palette.ivory} />
            </PressableScale>

            <Animated.View entering={enter(60)}>
              <Text style={styles.eyebrow}>{isLogin ? "WELCOME BACK" : "JOIN THE HOUSE"}</Text>
              <Text style={styles.title} testID="auth-title">
                {isLogin ? "Good to see you" : "Create your account"}
              </Text>
              <Text style={styles.subtitle}>
                {isLogin
                  ? "Your visits and rewards are waiting."
                  : "Start collecting visits from your very next meal."}
              </Text>
            </Animated.View>

            <Animated.View entering={enter(140)} style={styles.form}>
              {!isLogin && (
                <Field
                  label="NAME"
                  value={name}
                  onChangeText={setName}
                  placeholder="Your name"
                  autoCapitalize="words"
                  autoComplete="name"
                  focused={focused === "name"}
                  onFocus={() => setFocused("name")}
                  onBlur={() => setFocused(null)}
                  testID="auth-name-input"
                />
              )}

              <Field
                label="EMAIL"
                value={email}
                onChangeText={setEmail}
                placeholder="you@email.com"
                keyboardType="email-address"
                autoCapitalize="none"
                autoComplete="email"
                focused={focused === "email"}
                onFocus={() => setFocused("email")}
                onBlur={() => setFocused(null)}
                testID="auth-email-input"
              />

              <Field
                label="PASSWORD"
                value={password}
                onChangeText={setPassword}
                placeholder={isLogin ? "Your password" : "At least 6 characters"}
                secureTextEntry
                autoComplete={isLogin ? "current-password" : "new-password"}
                focused={focused === "password"}
                onFocus={() => setFocused("password")}
                onBlur={() => setFocused(null)}
                testID="auth-password-input"
              />

              {shownError && (
                <View style={styles.errorBox} testID="auth-error">
                  <Ionicons name="alert-circle" size={15} color={palette.error} />
                  <Text style={styles.errorText}>{shownError}</Text>
                </View>
              )}

              <Button
                label={isLogin ? "Sign in" : "Create account"}
                icon="arrow-forward"
                variant="gold"
                onPress={submit}
                loading={submitting}
                style={{ marginTop: spacing.xs }}
                testID="auth-submit"
              />

              {googleReady && (
                <>
                  <View style={styles.divider}>
                    <View style={styles.dividerLine} />
                    <Text style={styles.dividerText}>OR</Text>
                    <View style={styles.dividerLine} />
                  </View>

                  <PressableScale
                    style={styles.googleBtn}
                    onPress={google}
                    disabled={submitting}
                    testID="auth-google"
                    accessibilityRole="button"
                    accessibilityLabel="Continue with Google"
                  >
                    <Image
                      source={{
                        uri: "https://upload.wikimedia.org/wikipedia/commons/c/c1/Google_%22G%22_logo.svg",
                      }}
                      style={styles.googleIcon}
                    />
                    <Text style={styles.googleText}>Continue with Google</Text>
                  </PressableScale>
                </>
              )}

              <View style={styles.switchRow}>
                <Text style={styles.switchText}>
                  {isLogin ? "Not a member yet? " : "Already a member? "}
                </Text>
                <PressableScale
                  onPress={() => router.replace(isLogin ? "/(auth)/register" : "/(auth)/login")}
                  testID="auth-switch"
                >
                  <Text style={styles.switchLink}>{isLogin ? "Join" : "Sign in"}</Text>
                </PressableScale>
              </View>
            </Animated.View>
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </View>
  );
}

function Field({
  label,
  focused,
  ...input
}: React.ComponentProps<typeof TextInput> & { label: string; focused?: boolean }) {
  return (
    <View style={styles.field}>
      <Text style={[styles.fieldLabel, focused && { color: palette.goldOnLight }]}>{label}</Text>
      <TextInput
        {...input}
        style={[styles.input, focused && styles.inputFocused]}
        placeholderTextColor={palette.textMuted}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: palette.canvas },
  // A shallow walnut canopy behind the header so the screen isn't a flat page of
  // cream, and the back button always has something dark to sit on.
  canopy: { position: "absolute", top: 0, left: 0, right: 0, height: 300 },
  canopyGrain: { height: 300, bottom: undefined },

  scroll: { paddingHorizontal: spacing.lg, paddingBottom: spacing.xxl },
  back: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: "rgba(245,239,226,0.10)",
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: palette.borderDark,
    alignItems: "center",
    justifyContent: "center",
    marginTop: spacing.sm,
  },

  eyebrow: { ...type.eyebrow, color: palette.gold, marginTop: spacing.xl },
  title: { ...type.h1, fontSize: 34, lineHeight: 40, color: palette.ivory, marginTop: 6 },
  subtitle: { ...type.quoteSm, fontSize: 14, color: palette.textOnDarkMuted, marginTop: 6 },

  form: { gap: spacing.md, marginTop: spacing.xl },
  field: { gap: 7 },
  fieldLabel: { ...type.eyebrow, fontSize: 10, letterSpacing: 1.8, color: palette.textMuted },
  input: {
    ...type.body,
    fontSize: 16,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: palette.border,
    backgroundColor: palette.surface,
    paddingHorizontal: spacing.md,
    paddingVertical: 15,
    borderRadius: radii.md,
    color: palette.textPrimary,
  },
  inputFocused: { borderColor: palette.goldOnLight, backgroundColor: palette.surfaceRaised },

  errorBox: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: palette.errorSurface,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "rgba(142,53,53,0.25)",
    padding: 12,
    borderRadius: radii.md,
  },
  errorText: { ...type.bodySm, color: palette.error, flex: 1 },

  divider: { flexDirection: "row", alignItems: "center", gap: spacing.md, marginVertical: spacing.xs },
  dividerLine: { flex: 1, height: StyleSheet.hairlineWidth, backgroundColor: palette.border },
  dividerText: { ...type.eyebrow, fontSize: 9.5, color: palette.textMuted },

  googleBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.sm,
    minHeight: 54,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: palette.borderStrong,
    borderRadius: radii.full,
    backgroundColor: palette.surface,
  },
  googleIcon: { width: 19, height: 19 },
  googleText: { ...type.button, color: palette.textPrimary },

  switchRow: { flexDirection: "row", justifyContent: "center", alignItems: "center", marginTop: spacing.lg },
  switchText: { ...type.bodySm, color: palette.textSecondary },
  switchLink: { ...type.button, fontSize: 13, color: palette.goldOnLight },
});
