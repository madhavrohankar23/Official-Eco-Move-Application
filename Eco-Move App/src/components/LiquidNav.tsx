import React, { useEffect, useRef, useState } from 'react';
import { Animated, StyleSheet, useWindowDimensions, View } from 'react-native';
import { Home, Route, Compass, Ticket, UserRound } from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Glass } from './Glass';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme } from '../theme';
import { navbarLayout, TABS } from '../layout';
import type { Tab } from '../types';
import { MotionPressable as Pressable } from './MotionPressable';

const icons = [Home, Route, Compass, Ticket, UserRound];
const names = ['Home', 'Plan routes', 'Nearby transit', 'Trips and tickets', 'Profile and more'];

export function LiquidNav({
  tab,
  onSelect,
  hidden,
  footerInset = 0,
}: {
  tab: Tab;
  onSelect: (t: Tab) => void;
  hidden: boolean;
  footerInset?: number;
}) {
  const { width } = useWindowDimensions();
  const safe = useSafeAreaInsets();
  const { c, dark, reduceMotion } = useTheme();
  const [hovered, setHovered] = useState<Tab | null>(null);
  const [pressedTab, setPressedTab] = useState<Tab | null>(null);
  const layout = navbarLayout(width, safe.bottom, footerInset);
  const x = useRef(new Animated.Value(TABS.indexOf(tab) * layout.itemWidth)).current;
  const previousWidth = useRef(layout.itemWidth);
  const visibility = useRef(new Animated.Value(1)).current;
  const footerShift = useRef(new Animated.Value(footerInset)).current;
  useEffect(() => {
    const animation = Animated.spring(footerShift, { toValue: footerInset, stiffness: 280, damping: 28, mass: .85, overshootClamping: true, useNativeDriver: true, isInteraction: false });
    if (reduceMotion) footerShift.setValue(footerInset); else animation.start();
    return () => animation.stop();
  }, [footerInset, reduceMotion, footerShift]);

  useEffect(() => {
    const target = TABS.indexOf(tab) * layout.itemWidth;
    x.stopAnimation();
    if (reduceMotion || previousWidth.current !== layout.itemWidth) {
      x.setValue(target);
    } else {
      Animated.spring(x, {
        toValue: target,
        stiffness: 280,
        damping: 28,
        mass: 0.85,
        overshootClamping: true,
        isInteraction: false,
        useNativeDriver: true,
      }).start();
    }
    previousWidth.current = layout.itemWidth;
    return () => x.stopAnimation();
  }, [tab, layout.itemWidth, reduceMotion]);

  useEffect(() => {
    const animation = Animated.timing(visibility, {
      toValue: hidden ? 0 : 1,
      duration: reduceMotion ? 0 : 180,
      useNativeDriver: true,
      isInteraction: false,
    });
    animation.start();
    return () => animation.stop();
  }, [hidden, reduceMotion]);

  return (
    <Animated.View
      pointerEvents={hidden ? 'none' : 'auto'}
      accessibilityElementsHidden={hidden}
      importantForAccessibility={hidden ? 'no-hide-descendants' : 'auto'}
      aria-hidden={hidden}
      style={[
        styles.container,
        {
          width: layout.width,
          left: layout.left,
          bottom: layout.bottom - footerInset,
          opacity: visibility,
          transform: [
            {
              translateY: Animated.subtract(visibility.interpolate({
                inputRange: [0, 1],
                outputRange: [20, 0],
              }), footerShift),
            },
          ],
        },
      ]}
    >
      <Glass level={2} moving={!hidden} specular style={{ height: layout.height, borderRadius: layout.height / 2, ...(!dark ? {boxShadow:"0px 4px 16px rgba(15, 23, 42, 0.08)",shadowOpacity:0} : {}) }}>
        {dark ? <LinearGradient pointerEvents="none"
          colors={['rgba(75,83,81,.96)', 'rgba(27,35,34,.97)', 'rgba(7,14,15,.98)']}
          locations={[0,.48,1]}
          start={{x:0,y:0}} end={{x:1,y:.55}} style={StyleSheet.absoluteFill}/> :
          <LinearGradient pointerEvents="none"
          colors={['rgba(255, 255, 255, 0.98)', 'rgba(248, 250, 252, 0.94)']}
          start={{x:0,y:0}} end={{x:0.5,y:1}} style={StyleSheet.absoluteFill}/>}
        {/* Smoothly moving active liquid lens */}
        <Animated.View
          pointerEvents="none"
          style={{
            position: 'absolute',
            top: 8,
            left: layout.padding + 3,
            width: layout.itemWidth - 6,
            height: 52,
            transform: [{ translateX: x }],
          }}
        >
          {dark ? <LinearGradient
            colors={['#f2f6f3','#d2dbd6']}
            start={{x:0,y:0}} end={{x:1,y:1}}
            style={{flex:1,borderRadius:26,borderWidth:1,borderColor:'#ffffffc9',opacity:pressedTab===tab?.85:1,shadowColor:'#061c14',shadowOpacity:.16,shadowRadius:5,shadowOffset:{width:0,height:2}}}
          /> : <Glass
            level={3}
            state={pressedTab === tab ? 'pressed' : 'default'}
            specular
            blur={false}
            style={{
              flex: 1,
              borderRadius: 26,
              backgroundColor: '#ffffff',
              borderWidth: 1,
              borderColor: '#e2e8f0',
              shadowColor: '#0f172a',
              shadowOpacity: 0.08,
              shadowRadius: 6,
              shadowOffset: { width: 0, height: 2 },
            }}
          />}
        </Animated.View>

        {/* Five icon-only touch targets */}
        <View style={styles.row}>
          {TABS.map((item, index) => {
            const Icon = icons[index];
            const isSelected = item === tab;
            return (
              <Pressable
                key={item}
                testID={`nav-${item}`}
                accessibilityRole="tab"
                accessibilityLabel={names[index]}
                accessibilityState={{ selected: isSelected }}
                aria-selected={isSelected}
                onPress={() => onSelect(item)}
                onPressIn={() => setPressedTab(item)}
                onPressOut={() => setPressedTab(null)}
                onHoverIn={() => setHovered(item)}
                onHoverOut={() => setHovered(null)}
                style={{
                  width: layout.itemWidth,
                  height: 52,
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                {({ pressed }) => (
                  <View
                    style={{
                      width: 44, height: 44, borderRadius: 22,
                      alignItems: 'center', justifyContent: 'center',
                      backgroundColor: hovered === item || pressed ? (dark ? '#ffffff0c' : '#ffffff45') : 'transparent',
                      opacity: 1,
                    }}
                  >
                    <Icon
                      size={22}
                      color={dark ? (isSelected ? '#1c4c3b' : '#e0e9e5') : isSelected ? c.accent : c.ink}
                      strokeWidth={isSelected ? 2 : 1.8}
                    />
                  </View>
                )}
              </Pressable>
            );
          })}
        </View>
      </Glass>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    zIndex: 100,
    elevation: 10,
  },
  row: {
    flexDirection: 'row',
    padding: 8,
    alignItems: 'center',
  },
});

