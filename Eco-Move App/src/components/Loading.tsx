import React, { useEffect, useRef } from 'react';
import { Animated, Easing, View } from 'react-native';
import { useTheme } from '../theme';

export function LoadingRows({ count = 3 }: { count?: number }) {
  const { c, reduceMotion, active } = useTheme();
  const opacity = useRef(new Animated.Value(.55)).current;
  useEffect(() => {
    if (reduceMotion || !active) { opacity.setValue(.65); return; }
    const animation = Animated.loop(Animated.sequence([
      Animated.timing(opacity, { toValue: .85, duration: 850, easing: Easing.inOut(Easing.sin), useNativeDriver: true, isInteraction: false }),
      Animated.timing(opacity, { toValue: .55, duration: 850, easing: Easing.inOut(Easing.sin), useNativeDriver: true, isInteraction: false }),
    ]));
    animation.start(); return () => animation.stop();
  }, [reduceMotion, active, opacity]);
  return <Animated.View accessibilityElementsHidden aria-hidden importantForAccessibility="no-hide-descendants" pointerEvents="none" style={{ opacity, gap: 4 }}>
    {Array.from({ length: count }, (_, i) => <View key={i} style={{ height: 66, flexDirection: 'row', alignItems: 'center', gap: 13 }}>
      <View style={{ height: 38, width: 38, borderRadius: 14, backgroundColor: c.soft }} />
      <View style={{ flex: 1, gap: 9 }}><View style={{ height: 12, width: '72%', borderRadius: 6, backgroundColor: c.soft }} /><View style={{ height: 9, width: '46%', borderRadius: 5, backgroundColor: c.soft }} /></View>
    </View>)}
  </Animated.View>;
}
