// Admin tab layout — staff/owner/manager/host/waiter portal.
import { useEffect } from "react";
import { Tabs, useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { Platform, View } from "react-native";

import { useAuth } from "@/src/state/auth";
import { palette } from "@/src/lib/theme";

export default function AdminLayout() {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (loading) return;
    if (!user) router.replace("/(auth)/welcome");
    else if (user.role === "customer") router.replace("/(tabs)");
    else if (user.role === "waiter" || user.role === "host") router.replace("/(staff)");
  }, [user, loading, router]);

  if (!user || user.role === "customer" || user.role === "waiter" || user.role === "host") return null;

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: palette.gold,
        tabBarInactiveTintColor: "rgba(245,239,226,0.45)",
        tabBarLabelStyle: { fontSize: 10, fontWeight: "700", letterSpacing: 0.3 },
        tabBarStyle: {
          backgroundColor: palette.surfaceDarker,
          borderTopColor: "rgba(201,169,97,0.2)",
          borderTopWidth: 1,
          height: Platform.OS === "ios" ? 88 : 68,
          paddingTop: 8,
          paddingBottom: Platform.OS === "ios" ? 28 : 10,
        },
      }}
    >
      <Tabs.Screen name="index" options={{
        title: "Dashboard",
        tabBarIcon: ({ color, size }) => <Ionicons name="speedometer-outline" size={size} color={color} />,
      }} />
      <Tabs.Screen name="scan" options={{
        title: "Scan",
        tabBarIcon: ({ color }) => (
          <View style={{ width: 52, height: 52, borderRadius: 26, backgroundColor: palette.gold, alignItems: "center", justifyContent: "center", marginBottom: 4 }}>
            <Ionicons name="scan" size={24} color={palette.surfaceDarker} />
          </View>
        ),
        tabBarLabel: () => null,
      }} />
      <Tabs.Screen name="menu" options={{
        title: "Menu",
        tabBarIcon: ({ color, size }) => <Ionicons name="restaurant-outline" size={size} color={color} />,
      }} />
      <Tabs.Screen name="more" options={{
        title: "More",
        tabBarIcon: ({ color, size }) => <Ionicons name="apps-outline" size={size} color={color} />,
      }} />

      {/* Hidden routes (accessed via More) */}
      <Tabs.Screen name="rewards" options={{ href: null }} />
      <Tabs.Screen name="promotions" options={{ href: null }} />
      <Tabs.Screen name="staff" options={{ href: null /* reached from More, which already hides it from non-owners */ }} />
      <Tabs.Screen name="customers" options={{ href: null }} />
    </Tabs>
  );
}
