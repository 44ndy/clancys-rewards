// Loads everything the app renders text with: the two brand families plus the
// icon fonts.
//
// Brand fonts (Playfair Display + Manrope) load on EVERY platform — without them
// the app silently falls back to Roboto / San Francisco on device and the entire
// visual identity collapses. Each weight is its own family because React Native
// does not synthesise weight or italic for custom fonts on Android; the family
// names here must match `fonts` in src/lib/theme.ts exactly.
//
// Icon fonts keep the original conditional: they are only fetched from the CDN
// under Expo Go (StoreClient), where @expo/vector-icons' .ttf files come back as
// 0 bytes from Metro's asset resolver on Android. Native dev/prod builds and web
// resolve them through autolinking / web stubs instead.
//
// Usage: const [loaded, error] = useAppFonts();

import Constants, { ExecutionEnvironment } from "expo-constants";
import { useFonts } from "expo-font";

import {
  PlayfairDisplay_400Regular,
  PlayfairDisplay_400Regular_Italic,
  PlayfairDisplay_500Medium,
  PlayfairDisplay_600SemiBold,
  PlayfairDisplay_700Bold,
} from "@expo-google-fonts/playfair-display";
import {
  Manrope_400Regular,
  Manrope_500Medium,
  Manrope_600SemiBold,
  Manrope_700Bold,
  Manrope_800ExtraBold,
} from "@expo-google-fonts/manrope";

const ICON_VECTOR_VERSION = "15.0.3";

// short internal fontName (what the library queries) -> CDN .ttf file name
const ICON_FAMILIES: Record<string, string> = {
  anticon: "AntDesign",
  entypo: "Entypo",
  evilicons: "EvilIcons",
  feather: "Feather",
  FontAwesome: "FontAwesome",
  Fontisto: "Fontisto",
  foundation: "Foundation",
  ionicons: "Ionicons",
  "material-community": "MaterialCommunityIcons",
  material: "MaterialIcons",
  octicons: "Octicons",
  "simple-line-icons": "SimpleLineIcons",
  zocial: "Zocial",
  // FontAwesome5 style variants (key = `FontAwesome5Free-<style>`)
  "FontAwesome5Free-Regular": "FontAwesome5_Regular",
  "FontAwesome5Free-Solid": "FontAwesome5_Solid",
  "FontAwesome5Free-Brand": "FontAwesome5_Brands",
  // FontAwesome6 style variants (key = `FontAwesome6Free-<style>`)
  "FontAwesome6Free-Regular": "FontAwesome6_Regular",
  "FontAwesome6Free-Solid": "FontAwesome6_Solid",
  "FontAwesome6Free-Brand": "FontAwesome6_Brands",
};

const cdnUrl = (file: string): string =>
  `https://cdn.jsdelivr.net/npm/@expo/vector-icons@${ICON_VECTOR_VERSION}/build/vendor/react-native-vector-icons/Fonts/${file}.ttf`;

const iconFontMap = (): Record<string, string> =>
  Object.fromEntries(
    Object.entries(ICON_FAMILIES).map(([key, file]) => [key, cdnUrl(file)]),
  );

const brandFonts = {
  PlayfairDisplay_400Regular,
  PlayfairDisplay_400Regular_Italic,
  PlayfairDisplay_500Medium,
  PlayfairDisplay_600SemiBold,
  PlayfairDisplay_700Bold,
  Manrope_400Regular,
  Manrope_500Medium,
  Manrope_600SemiBold,
  Manrope_700Bold,
  Manrope_800ExtraBold,
};

export const useAppFonts = (): readonly [boolean, Error | null] =>
  useFonts({
    ...brandFonts,
    ...(Constants.executionEnvironment === ExecutionEnvironment.StoreClient
      ? iconFontMap()
      : {}),
  });

/** @deprecated Use `useAppFonts` — it loads the brand families too. */
export const useIconFonts = useAppFonts;
