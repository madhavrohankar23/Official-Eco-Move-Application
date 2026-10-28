import React, { useEffect, useRef } from 'react';
import { Animated, Easing, StyleSheet, View } from 'react-native';
import { Leaf } from 'lucide-react-native';
import { useTheme } from '../theme';
import { Copy, Glass } from './Glass';

/** Presentation only: never delays authentication or the map becoming usable. */
export function AuthEntrance({ children }: { children: React.ReactNode }) {
  const { reduceMotion } = useTheme();
  const entrance = useRef(new Animated.Value(reduceMotion ? 1 : 0)).current;
  useEffect(() => {
    if (reduceMotion) { entrance.setValue(1); return; }
    const animation = Animated.timing(entrance, {
      toValue: 1, duration: 420, easing: Easing.out(Easing.cubic),
      useNativeDriver: true, isInteraction: false,
    });
    animation.start();
    return () => animation.stop();
  }, [entrance, reduceMotion]);
  return <Animated.View pointerEvents="box-none" style={[StyleSheet.absoluteFill, {
    opacity: entrance,
    transform: [{ translateY: entrance.interpolate({ inputRange: [0, 1], outputRange: [10, 0] }) },
      { scale: entrance.interpolate({ inputRange: [0, 1], outputRange: [.985, 1] }) }],
  }]}>{children}</Animated.View>;
}

export function AuthLoading({ label }: { label: string }) {
  const { c, dark, reduceMotion, active } = useTheme();
  const light = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    if (reduceMotion || !active) { light.setValue(.5); return; }
    const animation = Animated.loop(Animated.timing(light, {
      toValue: 1, duration: 1800, easing: Easing.inOut(Easing.sin),
      useNativeDriver: true, isInteraction: false,
    }));
    animation.start();
    return () => animation.stop();
  }, [light, reduceMotion, active]);
  return <View accessibilityViewIsModal accessibilityRole="alert" accessibilityLiveRegion="polite"
    accessibilityLabel={label} style={[StyleSheet.absoluteFill, { zIndex: 50, alignItems: 'center',
      justifyContent: 'center', padding: 24, backgroundColor: dark ? '#030c1490' : '#edf3ed9c' }]}>
    <AuthEntrance>
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 }}>
        <Glass level={4} style={{ width: '100%', maxWidth: 310, borderRadius: 30 }}>
          <View style={{ padding: 28, alignItems: 'center', gap: 16 }}>
            <View style={{ width: 56, height: 56, borderRadius: 28, backgroundColor: c.soft,
              alignItems: 'center', justifyContent: 'center' }}><Leaf size={26} strokeWidth={1.6} color={c.accent}/></View>
            <Copy size={19} weight="600" style={{ textAlign: 'center' }}>{label}</Copy>
            <Copy muted size={13} style={{ textAlign: 'center', lineHeight: 19 }}>Your next journey is just ahead.</Copy>
            <View accessibilityElementsHidden importantForAccessibility="no-hide-descendants"
              style={{ width: 200, height: 3, overflow: 'hidden', borderRadius: 2, backgroundColor: c.soft }}>
              <Animated.View style={{ width: 64, height: 3, borderRadius: 2, backgroundColor: c.accent,
                opacity: reduceMotion ? .55 : light.interpolate({ inputRange: [0, .2, .8, 1], outputRange: [0, .8, .8, 0] }),
                transform: [{ translateX: light.interpolate({ inputRange: [0, 1], outputRange: [-64, 200] }) }] }}/>
            </View>
          </View>
        </Glass>
      </View>
    </AuthEntrance>
  </View>;
}
