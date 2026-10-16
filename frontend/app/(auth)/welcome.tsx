// Welcome — the first impression. Full-bleed house photography under a graded
// scrim, grain, and the crest.
//
// The scrim is doing real work: the hero is a photograph, so the luminance under
// the headline is not something we control. The three-stop gradient guarantees a
// contrast floor under the text block no matter what the image does, which is why
// it ramps to 0.92 rather than stopping at a tasteful 0.6.

import { useRouter } from "expo-router";
import { Image, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import Animated, { FadeIn, FadeInDown, ReduceMotion } from "react-native-reanimated";

import { gradients, palette, spacing, type } from "@/src/lib/theme";
import { Button } from "@/src/components/ui/Button";
import { Grain } from "@/src/components/ui/Grain";

const enter = (delay: number) =>
  FadeInDown.delay(delay).duration(620).reduceMotion(ReduceMotion.System);

export default function Welcome() {
  const router = useRouter();

  return (
    <View style={styles.root} testID="welcome-screen">
      <Image
        source={{ uri: "https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=1400&q=85" }}
        style={StyleSheet.absoluteFill}
        accessibilityIgnoresInvertColors
      />
      {/* Warms the whole frame toward the brand's oak/brass before the scrim lands. */}
      <View style={styles.warmWash} />
      <LinearGradient
        colors={gradients.photoScrim}
        style={StyleSheet.absoluteFill}
        locations={[0, 0.34, 0.68]}
      />
      <Grain opacity={0.07} />

      <SafeAreaView style={{ flex: 1 }} edges={["top", "bottom"]}>
        <Animated.View
          entering={FadeIn.duration(900).reduceMotion(ReduceMotion.System)}
          style={styles.crest}
        >
          <View style={styles.crestRule} />
          <Text style={styles.crestEst}>EST. 1824</Text>
          <View style={styles.crestRule} />
        </Animated.View>

        <View style={styles.content}>
          <Animated.Text entering={enter(160)} style={styles.eyebrow}>
            HERITAGE DINING · CORK
          </Animated.Text>

          <Animated.Text entering={enter(240)} style={styles.title} testID="welcome-title">
            Clancy&apos;s
          </Animated.Text>

          <Animated.Text entering={enter(340)} style={styles.tagline}>
            A taste of Ireland, since 1824.{"\n"}
            Carry the warmth of the snug in your pocket.
          </Animated.Text>

          <Animated.View entering={enter(460)} style={styles.actions}>
            <Button
              label="Join Clancy's Society"
              icon="arrow-forward"
              variant="gold"
              onPress={() => router.push("/(auth)/register")}
              testID="welcome-create-account"
            />
            <Button
              label="I'm already a member"
              variant="ghostDark"
              onPress={() => router.push("/(auth)/login")}
              testID="welcome-sign-in"
            />
          </Animated.View>
        </View>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: palette.background },
  warmWash: { ...StyleSheet.absoluteFillObject, backgroundColor: "rgba(58,36,24,0.28)" },

  crest: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.md,
    marginTop: spacing.lg,
    paddingHorizontal: spacing.xl,
  },
  crestRule: { flex: 1, maxWidth: 64, height: StyleSheet.hairlineWidth, backgroundColor: palette.borderGold },
  crestEst: { ...type.eyebrow, color: palette.gold, fontSize: 10, letterSpacing: 3.4 },

  content: {
    flex: 1,
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.lg,
    // Centred rather than floor-aligned: the two buttons were sitting on the
    // very bottom edge, which reads as an afterthought and puts the primary
    // action inside the home-indicator's thumb zone.
    justifyContent: "center",
  },
  eyebrow: { ...type.eyebrow, color: palette.gold, marginBottom: spacing.sm },
  title: {
    ...type.display,
    fontSize: 66,
    lineHeight: 72,
    color: palette.ivory,
    letterSpacing: -2.4,
  },
  tagline: {
    ...type.quote,
    fontSize: 16,
    lineHeight: 25,
    color: palette.textOnDarkMuted,
    marginTop: spacing.md,
    marginBottom: spacing.xl,
  },
  actions: { gap: spacing.sm + 2 },
});
