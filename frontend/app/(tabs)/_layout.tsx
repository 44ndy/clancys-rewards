import { useEffect } from "react";
import { Tabs, useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { Platform, View } from "react-native";
import { BlurView } from "expo-blur";

import { palette } from "@/src/lib/theme";
import { useAuth } from "@/src/state/auth";

export default function TabsLayout() {
  const { user, loading } = useAuth();
  const router = useRouter();

  // Kick back to Welcome on logout (or to Admin if a staff account ends up here) —
  // mirrors the guard in app/admin/_layout.tsx so signing out never leaves the
  // customer tabs stuck showing stale, no-longer-authorized data.
  useEffect(() => {
    if (loading) return;
    if (!user) router.replace("/(auth)/welcome");
    else if (user.role === "waiter" || user.role === "host") router.replace("/(staff)");
    else if (user.role !== "customer") router.replace("/admin");
  }, [user, loading, router]);

  if (!user || user.role !== "customer") return null;

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: palette.gold,
        tabBarInactiveTintColor: "rgba(245,239,226,0.45)",
        tabBarLabelStyle: { fontSize: 10, fontWeight: "700", letterSpacing: 0.5 },
        tabBarBackground: () =>
          Platform.OS === "ios" ? (
            <BlurView tint="dark" intensity={60} style={{ flex: 1, backgroundColor: "rgba(11,8,5,0.6)" }} />
          ) : (
            <View style={{ flex: 1, backgroundColor: palette.surfaceDarker }} />
          ),
        tabBarStyle: {
          position: "absolute",
          backgroundColor: Platform.OS === "ios" ? "transparent" : palette.surfaceDarker,
          borderTopColor: "rgba(201,169,97,0.2)",
          borderTopWidth: 1,
          height: Platform.OS === "ios" ? 88 : 68,
          paddingTop: 8,
          paddingBottom: Platform.OS === "ios" ? 28 : 10,
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: "Home",
          tabBarIcon: ({ color, size }) => <Ionicons name="home-outline" size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="rewards"
        options={{
          title: "Rewards",
          tabBarIcon: ({ color, size }) => <Ionicons name="ribbon-outline" size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="scan"
        options={{
          title: "My QR",
          tabBarIcon: ({ color }) => (
            <View
              style={{
                width: 52, height: 52, borderRadius: 26,
                backgroundColor: palette.gold,
                alignItems: "center", justifyContent: "center",
                marginBottom: 4,
                shadowColor: palette.gold, shadowOpacity: 0.5, shadowRadius: 12,
              }}
            >
              <Ionicons name="qr-code" size={24} color={palette.surfaceDarker} />
            </View>
          ),
          tabBarLabel: () => null,
        }}
      />
      <Tabs.Screen
        name="menu"
        options={{
          title: "Menu",
          tabBarIcon: ({ color, size }) => <Ionicons name="restaurant-outline" size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: "Profile",
          tabBarIcon: ({ color, size }) => <Ionicons name="person-circle-outline" size={size} color={color} />,
        }}
      />
    </Tabs>
  );
}
