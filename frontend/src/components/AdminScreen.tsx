// Shared chrome for every /admin screen: the walnut header band and the content
// well beneath it. Changing this file changes all nine admin screens at once.

import { type ReactNode } from "react";
import { ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";

import { gradients, palette, radii, spacing, type } from "@/src/lib/theme";
import { Grain } from "./ui/Grain";

export function AdminScreen({
  title,
  eyebrow,
  subtitle,
  children,
  scroll = true,
  action,
}: {
  title: string;
  eyebrow?: string;
  subtitle?: string;
  children: ReactNode;
  scroll?: boolean;
  action?: ReactNode;
}) {
  const Body = scroll ? ScrollView : View;

  return (
    <View style={styles.root}>
      <View style={styles.band}>
        <LinearGradient colors={gradients.walnut} style={StyleSheet.absoluteFill} />
        <Grain opacity={0.08} />
        <SafeAreaView edges={["top"]}>
          <View style={styles.header}>
            <View style={{ flex: 1 }}>
              <Text style={styles.eyebrow}>{eyebrow || "CLANCY'S ADMIN"}</Text>
              <Text style={styles.title}>{title}</Text>
              {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
            </View>
            {action}
          </View>
        </SafeAreaView>
      </View>

      <Body
        style={{ flex: 1 }}
        contentContainerStyle={scroll ? styles.body : undefined}
        showsVerticalScrollIndicator={false}
      >
        {children}
      </Body>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: palette.canvas },
  band: {
    overflow: "hidden",
    borderBottomLeftRadius: radii.xxl,
    borderBottomRightRadius: radii.xxl,
  },
  header: {
    padding: spacing.lg,
    paddingTop: spacing.sm,
    paddingBottom: spacing.lg,
    flexDirection: "row",
    alignItems: "flex-start",
    gap: spacing.md,
  },
  eyebrow: { ...type.eyebrow, color: palette.gold },
  title: { ...type.h1, color: palette.ivory, marginTop: 6 },
  subtitle: { ...type.quoteSm, color: palette.textOnDarkMuted, marginTop: 4 },
  body: { padding: spacing.lg, paddingBottom: 130 },
});
