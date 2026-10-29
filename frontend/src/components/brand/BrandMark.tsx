// The official Clancy's roundel.
//
// This is the client's registered mark, not something we drew — so the only
// job here is to reproduce it faithfully and never redraw, restyle or letter
// it ourselves. Two consequences that are easy to get wrong:
//
//   · The roundel already carries its own lettering. Any screen that sets the
//     same words again in Playfair puts a second, competing version of the
//     brand on the page. Use the mark, then stop.
//   · It is line art, so it is shipped as an alpha matte in a single ink and
//     is never recoloured at runtime. "gold" is for the dark walnut grounds,
//     "ivory" for the emerald card. Tinting a PNG per-platform drifts.
//
// Bundled locally, not fetched: a logo that arrives on the third frame reads
// as a broken app, and a store build cannot depend on someone else's CDN.

import { Image } from "expo-image";
import type { StyleProp, ImageStyle } from "react-native";

const SOURCES = {
  gold: require("@/assets/images/brand-gold.png"),
  ivory: require("@/assets/images/brand-ivory.png"),
} as const;

export type BrandMarkTone = keyof typeof SOURCES;

export function BrandMark({
  size = 72,
  tone = "gold",
  style,
}: {
  size?: number;
  tone?: BrandMarkTone;
  style?: StyleProp<ImageStyle>;
}) {
  return (
    <Image
      source={SOURCES[tone]}
      style={[{ width: size, height: size }, style]}
      contentFit="contain"
      // The mark is decorative wherever it appears — every screen that shows
      // it also names the restaurant in real text, so announcing it again
      // would just make a screen reader say "Clancy's" twice.
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      transition={200}
    />
  );
}
