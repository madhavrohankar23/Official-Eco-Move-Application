import React, { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import {
  Animated,
  Easing,
  PanResponder,
  Platform,
  ScrollView,
  StyleSheet,
  useWindowDimensions,
  View,
} from 'react-native';
import { ChevronDown, ChevronUp, X, ArrowLeft } from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../theme';
import { glassGeometry } from '../glassTokens';
import { Glass, Copy } from './Glass';
import { panelLayout } from '../layout';
import { MotionPressable as Pressable } from './MotionPressable';

export function Sheet({
  title,
  subtitle,
  children,
  collapsed,
  expanded,
  keyboard,
  onCollapse,
  onExpand,
  onClose,
  onBack,
  command = false,
  contentKey,
  footerInset = 0,
}: {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  collapsed: boolean;
  expanded: boolean;
  keyboard: number;
  onCollapse: () => void;
  onExpand: () => void;
  onClose: () => void;
  onBack?: () => void;
  command?: boolean;
  contentKey?: string;
  footerInset?: number;
}) {
  const { width, height } = useWindowDimensions();
  const safe = useSafeAreaInsets();
  const { c, dark, reduceMotion } = useTheme();
  const layout = panelLayout(width, height, safe.bottom, keyboard, expanded, collapsed, safe.top, footerInset);
  const animatedHeight = useRef(new Animated.Value(layout.height)).current;
  const footerShift = useRef(new Animated.Value(footerInset)).current;
  useEffect(() => {
    const animation = Animated.timing(footerShift, { toValue: footerInset, duration: reduceMotion ? 0 : 260, easing: Easing.out(Easing.cubic), useNativeDriver: true, isInteraction: false });
    animation.start(); return () => animation.stop();
  }, [footerInset, reduceMotion, footerShift]);
  const [renderHeight, setRenderHeight] = useState(layout.height);
  const resizeEpoch = useRef(0);
  const closeEpoch = useRef(0);
  const closing = useRef(false);
  const presence = useRef(new Animated.Value(0)).current;
  const bodyOpacity = useRef(new Animated.Value(collapsed ? 0 : 1)).current;
  const [bodyHidden, setBodyHidden] = useState(collapsed);
  const viewport = `${width}:${height}:${keyboard}:${safe.top}:${safe.bottom}`;
  const previousViewport = useRef(viewport);
  useLayoutEffect(() => {
    const immediate = reduceMotion || previousViewport.current !== viewport;
    previousViewport.current = viewport;
    if (!collapsed) setBodyHidden(false);
    const epoch = ++resizeEpoch.current;
    animatedHeight.stopAnimation(current => {
      if (epoch !== resizeEpoch.current) return;
      if (immediate) { animatedHeight.setValue(layout.height); setRenderHeight(layout.height); return; }
      // Layout changes only at the endpoints. The material scales from its bottom
      // edge while text translates, retaining its actual glyph size throughout.
      setRenderHeight(Math.max(current, layout.height));
      Animated.timing(animatedHeight, {
        toValue: layout.height, duration: contentKey === 'search' ? 300 : 260,
        easing: Easing.bezier(.2, .82, .2, 1), useNativeDriver: true, isInteraction: false,
      }).start(({ finished }) => {
        if (finished && epoch === resizeEpoch.current) setRenderHeight(layout.height);
      });
    });
    const body = Animated.timing(bodyOpacity, {
      toValue: collapsed ? 0 : 1, duration: reduceMotion ? 0 : collapsed ? 80 : 200,
      useNativeDriver: true, isInteraction: false,
    });
    body.start(({ finished }) => { if (finished && collapsed) setBodyHidden(true); });
    return () => { resizeEpoch.current++; animatedHeight.stopAnimation(); body.stop(); };
  }, [layout.height, viewport, collapsed, reduceMotion, animatedHeight, bodyOpacity]);
  useLayoutEffect(() => {
    closeEpoch.current++; closing.current = false;
    presence.stopAnimation();
    const enter = Animated.timing(presence, {
      toValue: 1, duration: reduceMotion ? 0 : 180,
      easing: Easing.out(Easing.cubic), useNativeDriver: true, isInteraction: false,
    });
    enter.start();
    return () => enter.stop();
  }, [contentKey, reduceMotion, presence]);
  const dismiss = () => {
    if (closing.current) return;
    closing.current = true;
    const epoch = ++closeEpoch.current;
    presence.stopAnimation();
    Animated.timing(presence, {
      toValue: 0, duration: reduceMotion ? 0 : 130,
      useNativeDriver: true, isInteraction: false,
    }).start(({ finished }) => { if (finished && epoch === closeEpoch.current) onClose(); });
  };
  useEffect(() => () => presence.stopAnimation(), [presence]);
  const scroll = useRef<any>(null);
  // A new destination starts at its heading; collapsing keeps its current position.
  useEffect(() => { scroll.current?.scrollTo({ y: 0, animated: false }); }, [contentKey]);

  const pan = useMemo(
    () =>
      PanResponder.create({
        onMoveShouldSetPanResponder: (_, g) =>
          Math.abs(g.dy) > 10 && Math.abs(g.dy) > Math.abs(g.dx),
        onPanResponderRelease: (_, g) => {
          if (g.dy > 30) onCollapse();
          else if (g.dy < -25) onExpand();
        },
      }),
    [onCollapse, onExpand]
  );

  return (
    <Animated.View
      testID="service-sheet"
      {...(Platform.OS === 'web' ? { onKeyDown: (event: any) => {
        if (event.key === 'Escape') { event.stopPropagation(); event.preventDefault(); collapsed ? dismiss() : onCollapse(); }
      } } : {})}
      pointerEvents="box-none"
      style={[
        s.position,
        {
          left: layout.left,
          right: layout.right,
          width: layout.width,
          bottom: layout.bottom - footerInset,
          transform: [{ translateY: Animated.multiply(footerShift, -1) }],
          height: renderHeight,
        },
      ]}
    >
      <Animated.View
        pointerEvents="box-none"
        style={{
          flex: 1,
          opacity: presence,
          transform: [{ translateY: presence.interpolate({ inputRange: [0, 1], outputRange: [10, 0] }) }],
        }}
      >
        <Glass
          level={command ? 4 : 3}
          specular
          moving={!collapsed}
          materialStyle={{ transformOrigin: 'bottom', transform: [{ scaleY: Animated.divide(animatedHeight, renderHeight) }] }}
          style={{
            flex: 1,
            borderRadius: glassGeometry.radius.sheet,
          }}
        >
        <Animated.View style={{ flex: 1, minHeight: 0, transform: [{ translateY: Animated.subtract(renderHeight, animatedHeight) }] }}>
        {/* Sleek Apple-inspired grab handle */}
        <View {...pan.panHandlers} style={s.handleArea}>
          <View
            style={[
              s.handle,
              { backgroundColor: dark ? 'rgba(255, 255, 255, 0.28)' : 'rgba(14, 36, 28, 0.22)' },
            ]}
          />
        </View>

        {/* Clean responsive sheet header */}
        <View style={s.header}>
          {onBack && (
            <Pressable
              accessibilityLabel="Back"
              accessibilityRole="button"
              onPress={onBack}
              style={s.hit}
            >
              {({ pressed }) => (
                <View>
                  <ArrowLeft size={20} color={c.ink} strokeWidth={2} />
                </View>
              )}
            </Pressable>
          )}

          <Pressable
            accessibilityRole="button"
            accessibilityLabel={collapsed ? 'Expand panel' : 'Collapse panel'}
            onPress={collapsed ? onExpand : onCollapse}
            style={{ flex: 1, paddingVertical: 4, justifyContent: 'center' }}
          >
            <Copy size={17} weight="600" numberOfLines={1} style={{ letterSpacing: -0.3 }}>
              {title}
            </Copy>
            {subtitle && !collapsed && (
              <Copy size={11} muted numberOfLines={1} style={{ letterSpacing: 0.2, marginTop: 1 }}>
                {subtitle}
              </Copy>
            )}
          </Pressable>

          <Pressable
            testID="sheet-collapse"
            accessibilityLabel={collapsed ? 'Expand panel' : 'Collapse panel'}
            accessibilityRole="button"
            onPress={collapsed ? onExpand : onCollapse}
            style={s.hit}
          >
            {({ pressed }) => (
              <View>
                {collapsed ? (
                  <ChevronUp size={20} color={c.ink} strokeWidth={1.8} />
                ) : (
                  <ChevronDown size={20} color={c.ink} strokeWidth={1.8} />
                )}
              </View>
            )}
          </Pressable>

          <Pressable
            testID="sheet-close"
            accessibilityLabel="Close panel"
            accessibilityRole="button"
            onPress={dismiss}
            style={s.hit}
          >
            {({ pressed }) => (
              <View>
                <X size={19} color={c.ink} strokeWidth={1.8} />
              </View>
            )}
          </Pressable>
        </View>

        {/* Scrollable sheet body */}
        <Animated.View pointerEvents={collapsed ? 'none' : 'auto'} accessibilityElementsHidden={collapsed} aria-hidden={collapsed}
          importantForAccessibility={collapsed ? 'no-hide-descendants' : 'auto'}
          style={{ flex: 1, minHeight: 0, overflow: 'hidden', opacity: bodyOpacity, display: bodyHidden ? 'none' : 'flex' }}>
        <ScrollView
          ref={scroll}
          keyboardShouldPersistTaps="handled"
          nestedScrollEnabled
          showsVerticalScrollIndicator={false}
          contentContainerStyle={s.content}
          style={{ flex: 1 }}
        >
          {children}
        </ScrollView>
        </Animated.View>
        </Animated.View>
      </Glass>
      </Animated.View>
    </Animated.View>
  );
}

const s = StyleSheet.create({
  position: {
    position: 'absolute',
    zIndex: 20,
  },
  handleArea: {
    minHeight: 26,
    paddingTop: 9,
    paddingBottom: 4,
    alignItems: 'center',
    justifyContent: 'center',
  },
  handle: {
    width: 38,
    height: 4.5,
    borderRadius: 3,
  },
  header: {
    paddingHorizontal: 18,
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: 50,
    gap: 6,
  },
  hit: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: {
    paddingHorizontal: 20,
    paddingTop: 6,
    paddingBottom: 36,
    gap: 14,
  },
});

