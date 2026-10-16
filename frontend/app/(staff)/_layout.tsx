// The floor's route group: waiters and hosts.
//
// One screen, no tab bar. The office (owner, manager) has its own group with
// the dashboard and the editors; a waiter never lands there, and a manager
// who opens this group is sent to theirs — the guard routes on role, so no
// screen inside either group has to check who is looking at it.

import { useEffect } from "react";
import { Stack, useRouter } from "expo-router";

import { useAuth } from "@/src/state/auth";
import { palette } from "@/src/lib/theme";

const FLOOR_ROLES = new Set(["waiter", "host"]);

export default function StaffLayout() {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (loading) return;
    if (!user) router.replace("/(auth)/welcome");
    else if (user.role === "customer") router.replace("/(tabs)");
    else if (!FLOOR_ROLES.has(user.role)) router.replace("/admin");
  }, [user, loading, router]);

  if (!user || !FLOOR_ROLES.has(user.role)) return null;

  return (
    <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: palette.walnut } }}>
      <Stack.Screen name="index" />
    </Stack>
  );
}
