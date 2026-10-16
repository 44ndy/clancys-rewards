// The press affordance for the whole app.
//
// Mobile has no hover, so press IS the affordance — and the feedback has to fire
// on press-IN, not on the completed tap. Waiting for the tap to resolve is the
// latency users actually perceive as "cheap app".
//
// Scale (not opacity) because scale takes the label and icons with it, which is
// what makes a control read as a physical object rather than a fading rectangle.
//
// Runs on the UI thread via Reanimated, so it keeps animating even while the JS
// thread is busy fetching. Honours Reduce Motion: the scale drops out, a subtle
// opacity change stays, because the user still needs to know the press landed.

import { type ReactNode } from "react";
import { Pressable, type PressableProps, type StyleProp, type ViewStyle } from "react-native";
import Animated, {
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withTiming,
  Easing,
} from "react-native-reanimated";

import { motion } from "@/src/lib/theme";

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);
const EASE_OUT = Easing.bezier(...motion.easeOut);

type Props = Omit<PressableProps, "style"> & {
  children: ReactNode;
  style?: StyleProp<ViewStyle>;
  /** Override the rest→pressed scale. 1 disables scaling (keeps the opacity dip). */
  scaleTo?: number;
  haptic?: boolean;
};

export function PressableScale({
  children,
  style,
  scaleTo = motion.pressScale,
  disabled,
  onPressIn,
  onPressOut,
  ...rest
}: Props) {
  const pressed = useSharedValue(0);
  const reduced = useReducedMotion();

  // The disabled dim lives inside the worklet: an animated opacity always wins
  // over a plain style further down the array, so a static `opacity` sibling
  // would simply never render.
  const animatedStyle = useAnimatedStyle(() => {
    const t = pressed.get();
    return {
      transform: reduced ? [] : [{ scale: 1 - (1 - scaleTo) * t }],
      opacity: disabled ? 0.42 : 1 - 0.12 * t,
    };
  });

  return (
    <AnimatedPressable
      {...rest}
      disabled={disabled}
      // A finger that drifts a few pixels still meant to press.
      pressRetentionOffset={{ top: 12, bottom: 12, left: 12, right: 12 }}
      // Anything visually smaller than 44pt still needs a 44pt target.
      hitSlop={8}
      onPressIn={(e) => {
        pressed.set(withTiming(1, { duration: motion.duration.press, easing: EASE_OUT }));
        onPressIn?.(e);
      }}
      onPressOut={(e) => {
        pressed.set(withTiming(0, { duration: motion.duration.press + 40, easing: EASE_OUT }));
        onPressOut?.(e);
      }}
      style={[style, animatedStyle]}
    >
      {children}
    </AnimatedPressable>
  );
}
