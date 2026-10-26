import React, { forwardRef, useEffect, useRef, useState } from 'react';
import { Animated, Platform, Pressable, PressableProps, StyleSheet, View } from 'react-native';
import { useTheme } from '../theme';
import * as Haptics from 'expo-haptics';

let lastHaptic = 0;

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

/** Preserves the original hit area, callbacks and accessibility semantics. */
export const MotionPressable = forwardRef<any, PressableProps>(function MotionPressable(
  { style, onPress, onPressIn, onPressOut, onFocus, onBlur, disabled, ...props }, ref,
) {
  const { reduceMotion, active, c } = useTheme();
  const [focused, setFocused] = useState(false);
  const [pressed, setPressed] = useState(false);
  const depth = useRef(new Animated.Value(1)).current;
  const initialDepth = useRef(true);
  useEffect(() => {
    if (initialDepth.current) { initialDepth.current = false; return; }
    const target = pressed && !disabled ? 0.985 : 1;
    if (reduceMotion || !active) {
      depth.setValue(1);
      return;
    }
    const motion = Animated.spring(depth, {
      toValue: target, stiffness: 430, damping: 35, mass: 0.65,
      overshootClamping: true, useNativeDriver: true, isInteraction: false,
    });
    motion.start();
    return () => motion.stop();
  }, [pressed, disabled, reduceMotion, active, depth]);
  const resolved = typeof style === 'function' ? style({ pressed }) : style;
  const existing = StyleSheet.flatten(resolved)?.transform;
  return (
    <AnimatedPressable
      {...props}
      ref={ref}
      disabled={disabled}
      onPress={event => {
        if (Platform.OS !== 'web' && active && !disabled && !reduceMotion && Date.now() - lastHaptic > 80) {
          lastHaptic = Date.now();
          // A completed tap, never a scroll gesture; unsupported devices fall back silently.
          void Haptics.selectionAsync().catch(() => {});
        }
        onPress?.(event);
      }}
      onFocus={event => { setFocused(Platform.OS !== 'web' || ((event.target as any).matches?.(':focus-visible') ?? true)); onFocus?.(event); }}
      onBlur={event => { setFocused(false); onBlur?.(event); }}
      onPressIn={event => { setPressed(true); onPressIn?.(event); }}
      onPressOut={event => { setPressed(false); onPressOut?.(event); }}
      style={[resolved, Platform.OS === 'web' && focused ? { outlineColor: c.accent, outlineStyle: 'solid', outlineWidth: 2, outlineOffset: 2 } as any : undefined,
        { transform: [...(Array.isArray(existing) ? existing : []), { scale: depth }] }]}
    />
  );
});
