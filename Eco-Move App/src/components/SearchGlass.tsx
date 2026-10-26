import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Animated, Easing, StyleProp, StyleSheet, View, ViewStyle } from 'react-native';
import { Search, Sparkles } from 'lucide-react-native';
import Svg, { Rect } from 'react-native-svg';
import { useTheme } from '../theme';
import { capsuleTrack } from '../materialMotion';
import { glassMaterial } from '../glassTokens';
import { Copy, Glass } from './Glass';
import { MotionPressable } from './MotionPressable';

export function SearchGlass({ label, onPress, style }: {
  label: string; onPress: () => void; style?: StyleProp<ViewStyle>;
}) {
  const t = useTheme();
  const [width, setWidth] = useState(0);
  const [focused, setFocused] = useState(false);
  const [hovered, setHovered] = useState(false);
  const travel = useRef(new Animated.Value(0)).current;
  const height = 52;
  const track = useMemo(() => capsuleTrack(Math.max(height, width), height), [width]);
  const contrastRatio = Math.max(0, Math.min(100, t.contrastLevel ?? (t.contrast ? 100 : 0))) / 100;
  const material = glassMaterial(t.appearance, t.dark, t.contrastLevel, 2);
  const flowing = t.active && !t.reduceMotion && material.flowing && width > 0;
  useEffect(() => {
    if (!flowing) return;
    travel.setValue(0);
    const animation = Animated.loop(Animated.timing(travel, {
      toValue: 1, duration: 14000, easing: Easing.linear,
      useNativeDriver: true, isInteraction: false,
    }));
    animation.start();
    return () => animation.stop();
  }, [flowing, width, travel]);

  return (
    <MotionPressable
      testID="global-search" accessibilityRole="button" accessibilityLabel="Search Nagpur"
      onPress={onPress} onFocus={() => setFocused(true)} onBlur={() => setFocused(false)}
      onHoverIn={() => setHovered(true)} onHoverOut={() => setHovered(false)}
      onLayout={event => setWidth(event.nativeEvent.layout.width)}
      style={[{ borderRadius: 26 }, style]}
    >
      {({ pressed }) => <>
        <Glass level={2} specular state={pressed ? 'pressed' : focused ? 'focused' : hovered ? 'hover' : 'default'} style={{ borderRadius: 26 }}>
          <View style={{ height, flexDirection: 'row', alignItems: 'center', gap: 11, paddingHorizontal: 17 }}>
            <Search size={19} color={t.c.muted} strokeWidth={1.7}/>
            <Copy muted size={15} style={{ flex: 1 }} numberOfLines={1}>{label}</Copy>
            <Sparkles size={18} color={t.c.accent}/>
          </View>
        </Glass>
        {width > 0 && <View pointerEvents="none" accessibilityElementsHidden importantForAccessibility="no-hide-descendants" style={StyleSheet.absoluteFill}>
          <Svg width={width} height={height}>
            <Rect x={1.25} y={1.25} width={width - 2.5} height={height - 2.5} rx={24.75}
              fill="none" stroke={t.c.accent} strokeWidth={0.75 + contrastRatio * 0.75}
              opacity={contrastRatio > 0 ? (0.22 + contrastRatio * 0.58) : t.dark ? 0.32 : 0.20}/>
          </Svg>
          {flowing && <Animated.View testID="search-border-light" style={{
            position: 'absolute', left: -17, top: -5, width: 34, height: 10,
            alignItems: 'center', justifyContent: 'center', opacity: pressed ? 0.35 : 0.70,
            transform: [
              { translateX: travel.interpolate({ inputRange: track.input, outputRange: track.x }) },
              { translateY: travel.interpolate({ inputRange: track.input, outputRange: track.y }) },
              { rotate: travel.interpolate({ inputRange: track.input, outputRange: track.angle }) },
            ],
          }}>
            <View style={{ position: 'absolute', width: 34, height: 10, borderRadius: 5, backgroundColor: t.dark ? '#69e9ad15' : '#2aa66b10' }}/>
            <View style={{ position: 'absolute', width: 25, height: 5, borderRadius: 3, backgroundColor: t.dark ? '#7aefb72c' : '#2aa66b24' }}/>
            <View style={{ width: 15, height: 1.5, borderRadius: 1, backgroundColor: t.dark ? '#a2f6ce' : '#258c60' }}/>
          </Animated.View>}
        </View>}
      </>}
    </MotionPressable>
  );
}
