import { ActivityIndicator, StyleSheet, View } from "react-native";
import { Redirect } from "expo-router";

import { useAuth } from "@/src/state/auth";
import { palette } from "@/src/lib/theme";

export default function Index() {
  const { user, loading } = useAuth();
  if (loading) {
    return (
      <View style={styles.container} testID="splash-loading">
        <ActivityIndicator size="large" color={palette.gold} />
      </View>
    );
  }
  if (!user) return <Redirect href="/(auth)/welcome" />;
  if (user.role === "customer") return <Redirect href="/(tabs)" />;
  // The floor and the office are different apps: a waiter never sees a dashboard.
  if (user.role === "waiter" || user.role === "host") return <Redirect href="/(staff)" />;
  return <Redirect href="/admin" />;
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: palette.background, alignItems: "center", justifyContent: "center" },
});
