// AuthContext: manages session token + user, exposes signIn / signUp / signOut / googleSignIn.
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { Platform } from "react-native";
import * as Google from "expo-auth-session/providers/google";
import * as Notifications from "expo-notifications";

import { api, tokenStore, type User } from "@/src/lib/api";

type AuthCtx = {
  user: User | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string, name: string) => Promise<void>;
  signInWithGoogle: () => Promise<void>;
  googleReady: boolean;
  /** Set when a Google redirect came back but the sign-in could not be completed. */
  googleError: string | null;
  clearGoogleError: () => void;
  signOut: () => Promise<void>;
  refresh: () => Promise<void>;
};

const Ctx = createContext<AuthCtx | null>(null);

// Real Google OAuth Client IDs (create at https://console.cloud.google.com/apis/credentials).
// Talks to Google directly — no third-party auth proxy, no "secured by X" badge.
const GOOGLE_WEB_CLIENT_ID = process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID || "";
const GOOGLE_IOS_CLIENT_ID = process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID || GOOGLE_WEB_CLIENT_ID;
const GOOGLE_ANDROID_CLIENT_ID = process.env.EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID || GOOGLE_WEB_CLIENT_ID;

const GOOGLE_NONCE_KEY = "clancys_google_nonce";
const GOOGLE_STATE_KEY = "clancys_google_state";

function randomToken(): string {
  const bytes = new Uint8Array(16);
  if (typeof window !== "undefined" && window.crypto?.getRandomValues) {
    window.crypto.getRandomValues(bytes);
  } else {
    for (let i = 0; i < bytes.length; i++) bytes[i] = Math.floor(Math.random() * 256);
  }
  return Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
}

/**
 * Google's redirect lands on "/" with the token in the URL fragment. This has to
 * be captured at MODULE LOAD, not in an effect: expo-router's index route
 * redirects an unauthenticated visitor to /welcome from its own effect, and child
 * effects run before the provider's, so by the time AuthProvider mounted its
 * effect the fragment had already been navigated away. Reading it here — before
 * React renders anything — makes the handoff immune to that race.
 */
const pendingGoogleRedirect = (() => {
  if (typeof window === "undefined" || !window.location.hash.includes("id_token=")) return null;
  const params = new URLSearchParams(window.location.hash.replace(/^#/, ""));
  const captured = {
    idToken: params.get("id_token"),
    state: params.get("state"),
    error: params.get("error_description") || params.get("error"),
  };
  // Strip the credential out of the address bar immediately.
  window.history.replaceState(null, "", window.location.pathname);
  return captured;
})();

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const registeredPushFor = useRef<string | null>(null);
  const [googleError, setGoogleError] = useState<string | null>(null);

  const [, , promptGoogleAsync] = Google.useIdTokenAuthRequest({
    webClientId: GOOGLE_WEB_CLIENT_ID,
    iosClientId: GOOGLE_IOS_CLIENT_ID,
    androidClientId: GOOGLE_ANDROID_CLIENT_ID,
  });

  // restore session on mount
  useEffect(() => {
    (async () => {
      try {
        const token = await tokenStore.get();
        if (token) {
          const me = await api.me();
          setUser(me);
        }
      } catch {
        await tokenStore.clear();
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  // Register for push notifications once we have a user (native only).
  useEffect(() => {
    if (!user || Platform.OS === "web") return;
    if (registeredPushFor.current === user.user_id) return;
    registeredPushFor.current = user.user_id;
    (async () => {
      try {
        const { status: existing } = await Notifications.getPermissionsAsync();
        let status = existing;
        if (existing !== "granted") {
          const r = await Notifications.requestPermissionsAsync();
          status = r.status;
        }
        if (status !== "granted") return;
        const tokenResp = await Notifications.getDevicePushTokenAsync();
        await api.registerPush(Platform.OS, tokenResp.data);
      } catch (e) {
        // non-blocking
        console.log("push register skipped:", e);
      }
    })();
  }, [user]);

  const signIn = useCallback(async (email: string, password: string) => {
    const r = await api.login(email, password);
    await tokenStore.set(r.token);
    setUser(r.user);
  }, []);

  const signUp = useCallback(async (email: string, password: string, name: string) => {
    const r = await api.register(email, password, name);
    await tokenStore.set(r.token);
    setUser(r.user);
  }, []);

  // Web: full-page redirect straight to accounts.google.com (see the useEffect below for the
  // return leg). No popup — browsers kill window.open() once any await happens between the
  // click and the call (expo-auth-session's web popup hits exactly that on every browser),
  // so a real redirect is the reliable option here. Native keeps the expo-auth-session flow,
  // which opens a proper system browser sheet and isn't subject to that popup timing rule.
  const signInWithGoogle = useCallback(async () => {
    if (!GOOGLE_WEB_CLIENT_ID) {
      throw new Error("Google sign-in isn't set up yet (missing EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID).");
    }
    if (Platform.OS === "web") {
      const nonce = randomToken();
      const state = randomToken();
      window.sessionStorage.setItem(GOOGLE_NONCE_KEY, nonce);
      window.sessionStorage.setItem(GOOGLE_STATE_KEY, state);
      // Always the bare origin — must exactly match an "Authorized redirect URI" in the
      // Google Cloud OAuth client, so it can't vary with whatever screen you clicked from.
      const redirectUri = window.location.origin + "/";
      const params = new URLSearchParams({
        client_id: GOOGLE_WEB_CLIENT_ID,
        redirect_uri: redirectUri,
        response_type: "id_token",
        scope: "openid email profile",
        nonce,
        state,
        prompt: "select_account",
      });
      window.location.href = `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;
      return; // navigating away — nothing else to do here
    }
    const result = await promptGoogleAsync();
    if (result.type === "dismiss" || result.type === "cancel" || result.type === "locked") return;
    if (result.type !== "success") {
      throw new Error((result as { error?: { message?: string } }).error?.message || "Google sign-in failed");
    }
    const idToken = result.params?.id_token;
    if (!idToken) throw new Error("Google didn't return an id_token");
    const r = await api.googleLogin(idToken);
    await tokenStore.set(r.token);
    setUser(r.user);
  }, [promptGoogleAsync]);

  // Web: finish the sign-in Google redirected back from.
  //
  // `loading` stays true for the whole exchange so the router holds on the splash
  // instead of bouncing to Welcome and back. Every failure path sets googleError —
  // silently returning the visitor to the home screen with no explanation is the
  // worst possible outcome here, and it is exactly what this used to do.
  useEffect(() => {
    if (Platform.OS !== "web" || !pendingGoogleRedirect) return;

    const { idToken, state: returnedState, error } = pendingGoogleRedirect;
    const expectedState = window.sessionStorage.getItem(GOOGLE_STATE_KEY);
    const nonce = window.sessionStorage.getItem(GOOGLE_NONCE_KEY) || undefined;
    window.sessionStorage.removeItem(GOOGLE_STATE_KEY);
    window.sessionStorage.removeItem(GOOGLE_NONCE_KEY);

    if (error) {
      setGoogleError(`Google refused the sign-in: ${error}`);
      return;
    }
    if (!idToken) {
      setGoogleError("Google didn't return a sign-in token. Please try again.");
      return;
    }
    if (!returnedState || returnedState !== expectedState) {
      setGoogleError("That sign-in link didn't match this device. Please try again.");
      return;
    }

    setLoading(true);
    (async () => {
      try {
        const r = await api.googleLogin(idToken, nonce);
        await tokenStore.set(r.token);
        setUser(r.user);
        setGoogleError(null);
      } catch (e: any) {
        setGoogleError(e?.message || "Couldn't reach Clancy's to finish signing you in.");
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const signOut = useCallback(async () => {
    try {
      await api.logout();
    } catch {}
    await tokenStore.clear();
    setUser(null);
    registeredPushFor.current = null;
  }, []);

  const refresh = useCallback(async () => {
    try {
      const me = await api.me();
      setUser(me);
    } catch {}
  }, []);

  const clearGoogleError = useCallback(() => setGoogleError(null), []);

  const googleReady = !!GOOGLE_WEB_CLIENT_ID;

  const value = useMemo(
    () => ({ user, loading, signIn, signUp, signInWithGoogle, googleReady, googleError, clearGoogleError, signOut, refresh }),
    [user, loading, signIn, signUp, signInWithGoogle, googleReady, googleError, clearGoogleError, signOut, refresh]
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useAuth() {
  const c = useContext(Ctx);
  if (!c) throw new Error("useAuth must be used within AuthProvider");
  return c;
}
