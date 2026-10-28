import React, { createContext, useContext, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Animated,
  Easing,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  TextInputProps,
  View,
  ViewStyle,
  StyleProp,
} from 'react-native';
import { BlurView } from 'expo-blur';
import { GlassView, isLiquidGlassAvailable } from 'expo-glass-effect';
import { LinearGradient } from 'expo-linear-gradient';
import { X } from 'lucide-react-native';
import { useTheme } from '../theme';
import { glassGeometry, glassMaterial } from '../glassTokens';
import { MotionPressable as Pressable } from './MotionPressable';

// One backdrop sample per major surface. Cards inside it inherit its material.
const MaterialParent = createContext(false);

export type MaterialState =
  | 'default'
  | 'hover'
  | 'pressed'
  | 'active'
  | 'selected'
  | 'focused'
  | 'disabled'
  | 'loading'
  | 'success'
  | 'error';

export function Glass({
  children,
  level = 2,
  state = 'default',
  style,
  blur = true,
  specular = false,
  moving = false,
  isolated = false,
  materialStyle,
}: {
  children?: React.ReactNode;
  level?: 1 | 2 | 3 | 4;
  state?: MaterialState;
  style?: StyleProp<ViewStyle>;
  moving?: boolean;
  blur?: boolean;
  specular?: boolean;
  isolated?: boolean;
  materialStyle?: StyleProp<ViewStyle> | any;
}) {
  const t = useTheme();
  const parentMaterial = useContext(MaterialParent);
  const nested = parentMaterial && !isolated;
  const samplesBackdrop = blur && !nested;
  const contrastRatio = Math.max(0, Math.min(100, t.contrastLevel)) / 100;
  // CSS support detection is presentation-only. The fallback keeps the same
  // readable tint; Android avoids the existing WebView backdrop capture defect.
  const webBlur = Platform.OS !== 'web' || (typeof CSS !== 'undefined' &&
    (CSS.supports('backdrop-filter', 'blur(1px)') || CSS.supports('-webkit-backdrop-filter', 'blur(1px)')));
  const material = glassMaterial(t.appearance, t.dark, t.contrastLevel, level, nested, webBlur && Platform.OS !== 'android');
  const backdrop = samplesBackdrop && material.blur > 0 && webBlur && Platform.OS !== 'android';
  const nativeGlass = Platform.OS === 'ios' && t.dark && t.appearance === 'liquid' && isLiquidGlassAvailable() && contrastRatio < .25;
  const illumination = useRef(new Animated.Value(state === 'focused' ? 1 : state === 'hover' ? .65 : state === 'pressed' ? 0 : .2)).current;
  const initialMaterial = useRef(true);
  const selection = useRef(new Animated.Value(['active', 'selected', 'success'].includes(state) ? 1 : 0)).current;
  const reflection = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    if (!moving || !material.flowing || t.reduceMotion || t.contrast || !t.active) {
      reflection.setValue(0);
      return;
    }
    const motion = Animated.loop(Animated.sequence([
      Animated.timing(reflection, { toValue: 1, duration: glassGeometry.motion.reflection, easing: Easing.inOut(Easing.sin), useNativeDriver: true, isInteraction: false }),
      Animated.timing(reflection, { toValue: 0, duration: glassGeometry.motion.reflection, easing: Easing.inOut(Easing.sin), useNativeDriver: true, isInteraction: false }),
    ]));
    motion.start();
    return () => motion.stop();
  }, [moving, material.flowing, t.reduceMotion, t.contrast, t.active, reflection]);

  const selected = ['active', 'selected', 'success'].includes(state);
  const focused = state === 'focused';
  const pressed = state === 'pressed';
  const hover = state === 'hover';
  useEffect(() => {
    // Large service lists start at their resting material. Animate interaction
    // changes only, avoiding hundreds of invisible mount animations in Nearby.
    if (initialMaterial.current) { initialMaterial.current = false; return; }
    const animation = Animated.parallel([
      Animated.timing(illumination, { toValue: pressed ? 0 : focused ? 1 : hover ? 0.65 : 0.2, duration: t.reduceMotion ? 0 : glassGeometry.motion.feedback, useNativeDriver: true, isInteraction: false }),
      Animated.timing(selection, { toValue: selected ? 1 : 0, duration: t.reduceMotion ? 0 : glassGeometry.motion.selection, useNativeDriver: true, isInteraction: false }),
    ]);
    animation.start();
    return () => animation.stop();
  }, [pressed, focused, hover, selected, t.reduceMotion, illumination, selection]);

  const edge = state === 'error'
    ? t.c.error
    : focused
    ? (t.dark ? t.c.accent : '#94a3b8')
    : selected
    ? (t.dark ? 'rgba(168, 233, 194, 0.42)' : t.c.accent)
    : material.edge;

  const flatRadius = StyleSheet.flatten(style)?.borderRadius ?? glassGeometry.radius.card;
  const transition = Platform.OS === 'web' ? {
    transitionProperty: 'background-color, border-color, box-shadow',
    transitionDuration: t.reduceMotion ? '0ms' : `${glassGeometry.motion.material}ms`,
    transitionTimingFunction: 'cubic-bezier(.2,.8,.2,1)',
  } as any : undefined;

  return (
    <View
      style={[
        samplesBackdrop && (level > 1 || !t.dark) && !materialStyle ? s.shadow : null,
        {
          borderRadius: flatRadius,
          shadowOpacity: !samplesBackdrop || materialStyle ? 0 : material.shadowOpacity,
          shadowRadius: !samplesBackdrop ? 0 : material.shadowRadius,
          elevation: !samplesBackdrop || level === 1 || materialStyle ? 0 : Math.min(6, level + 1),
          opacity: state === 'disabled' ? 0.65 : 1,
        },
        style,
      ]}
    >
      {/* Sheet material scales independently of its content. Keep its shadow
          outside the clipping layer and attached to the same silhouette. */}
      {!t.dark && samplesBackdrop && materialStyle && <Animated.View pointerEvents="none"
        style={[StyleSheet.absoluteFill,{borderRadius:flatRadius,boxShadow:'0px 7px 22px rgba(15, 23, 42, 0.08)'},materialStyle]}/>}
      <View
        testID={`glass-${t.appearance}-${level}`}
        style={[
          s.surface,
          {
            borderRadius: flatRadius,
            backgroundColor: 'transparent',
          },
        ]}
      >
        <Animated.View pointerEvents="none" style={[StyleSheet.absoluteFill, { borderRadius: flatRadius, overflow: 'hidden' }, materialStyle]}>
        {backdrop && (
          nativeGlass ? (
            <GlassView
              pointerEvents="none"
              style={StyleSheet.absoluteFill}
              glassEffectStyle={level === 1 ? 'clear' : 'regular'}
              colorScheme={t.dark ? 'dark' : 'light'}
              tintColor={selected ? (t.dark ? '#4ade8025' : '#186d4e18') : undefined}
              isInteractive={false}
            />
          ) : Platform.OS === 'web' ? (
            <View pointerEvents="none" style={[StyleSheet.absoluteFill, {
              backdropFilter: `blur(${material.blur}px) saturate(${material.saturation})`,
              WebkitBackdropFilter: `blur(${material.blur}px) saturate(${material.saturation})`,
            } as any]} />
          ) : (
            <BlurView
              pointerEvents="none"
              style={StyleSheet.absoluteFill}
              intensity={material.blur}
              tint={t.dark ? 'dark' : 'light'}
            />
          )
        )}

        <View pointerEvents="none" style={[StyleSheet.absoluteFill, { backgroundColor: material.tint }, transition]} />

        {/* Selected mint luminescence */}
          <Animated.View
            pointerEvents="none"
            style={[
              StyleSheet.absoluteFill,
              { opacity: selection, backgroundColor: material.selection },
            ]}
          />

        {/* Full-surface gradients have no mid-control cutoffs or white streaks. */}
        {(specular || level >= 2 || hover || focused) && contrastRatio < 0.75 && (
          <LinearGradient
            pointerEvents="none"
            colors={
              t.dark
                ? [`rgba(234, 255, 247, ${material.highlight})`, 'rgba(234, 255, 247, 0)', `rgba(0, 15, 8, ${material.highlight * .8})`]
                : ['rgba(255, 255, 255, 0.95)', 'rgba(255, 255, 255, 0.4)', 'rgba(241, 245, 249, 0.7)']
            }
            start={{ x: 0, y: 0 }}
            end={{ x: 0.7, y: 1 }}
            style={[
              StyleSheet.absoluteFill,
              { opacity: (1 - contrastRatio * 0.8) * (pressed ? 0.35 : hover || focused ? 1 : 0.8) },
            ]}
          />
        )}

        {moving && material.flowing && <Animated.View pointerEvents="none" style={{ position: 'absolute', top: 0, bottom: 0, left: -60, right: -60, opacity: 1 - contrastRatio, transform: [{ translateX: reflection.interpolate({ inputRange: [0, 1], outputRange: [-35, 35] }) }] }}>
          <LinearGradient colors={['transparent', t.dark ? `rgba(230,255,240,${material.reflection * .35})` : `rgba(255,255,255,${material.reflection * .5})`, 'transparent']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0.6 }} style={StyleSheet.absoluteFill}/>
          <LinearGradient colors={['transparent', t.dark ? `rgba(230,255,240,${material.reflection * 5})` : `rgba(255,255,255,${material.reflection * 5})`, 'transparent']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 1.5 }}/>
        </Animated.View>}
        {t.dark && contrastRatio < 0.85 && <Animated.View pointerEvents="none" style={[StyleSheet.absoluteFill, { opacity: illumination, backgroundColor: '#ffffff09' }]}/>}
        <View pointerEvents="none" style={[StyleSheet.absoluteFill, { borderRadius: flatRadius, borderWidth: focused ? 1.5 : 1, borderColor: edge, borderTopColor: focused || state === 'error' ? edge : material.topEdge }, transition]}/>
        </Animated.View>
        <MaterialParent.Provider value={nested || samplesBackdrop}>{children}</MaterialParent.Provider>
      </View>
    </View>
  );
}

export function Copy({
  children,
  size = 15,
  muted = false,
  accent = false,
  weight = '400',
  style,
  ...rest
}: any) {
  const { c } = useTheme();
  return (
    <Text
      {...rest}
      style={[
        {
          fontSize: size,
          lineHeight: Math.round(size * 1.36),
          color: accent ? c.accent : muted ? c.muted : c.ink,
          fontWeight: weight,
          fontFamily: Platform.OS === 'web' ? '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif' : Platform.OS === 'ios' ? undefined : 'sans-serif',
          letterSpacing: size >= 24 ? -0.6 : size <= 11 ? 0.3 : -0.1,
          backgroundColor: 'transparent',
          includeFontPadding: false,
          flexShrink: 1,
          minWidth: 0,
        },
        style,
      ]}
    >
      {children}
    </Text>
  );
}

export function Action({
  label,
  accessibilityLabel = label,
  icon: Icon,
  onPress,
  selected = false,
  disabled = false,
  loading = false,
  compact = false,
  quiet = false,
  danger = false,
  style,
  testID,
}: any) {
  const { c, dark } = useTheme();
  const [hover, setHover] = useState(false);
  const [focus, setFocus] = useState(false);
  const minH = compact ? 44 : 48;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      aria-selected={selected}
      aria-busy={loading}
      accessibilityState={{ selected, disabled: disabled || loading, busy: loading }}
      testID={testID}
      disabled={disabled || loading}
      onPress={onPress}
      onHoverIn={() => setHover(true)}
      onHoverOut={() => setHover(false)}
      onFocus={() => setFocus(true)}
      onBlur={() => setFocus(false)}
      style={[{ minHeight: minH, flexShrink: 1 }, style]}
    >
      {({ pressed }) => (
        <Glass
          blur={false}
          level={selected ? 2 : 1}
          state={
            disabled
              ? 'disabled'
              : loading
              ? 'loading'
              : pressed
              ? 'pressed'
              : focus
              ? 'focused'
              : hover
              ? 'hover'
              : selected
              ? 'selected'
              : 'default'
          }
          style={{
            borderRadius: compact ? 16 : 20,
            flexGrow: 1,
          }}
        >
          <View
            style={[
              s.action,
              {
                minHeight: minH,
                paddingVertical: compact ? 8 : 11,
                paddingHorizontal: compact ? 10 : 16,
                gap: compact ? 6 : 8,
                backgroundColor: quiet ? 'transparent' : undefined,
              },
            ]}
          >
            {loading ? (
              <ActivityIndicator size="small" color={c.accent} />
            ) : Icon ? (
              <Icon
                size={compact ? 16 : 18}
                color={danger ? c.error : selected ? c.accent : c.ink}
                strokeWidth={selected ? 2 : 1.85}
              />
            ) : null}
            <Copy
              weight="600"
              size={compact ? 13.5 : 15}
              numberOfLines={2}
              ellipsizeMode="tail"
              style={{
                color: danger ? c.error : selected ? c.accent : c.ink,
                flexShrink: 1,
                textAlign: 'center',
              }}
            >
              {label}
            </Copy>
          </View>
        </Glass>
      )}
    </Pressable>
  );
}

export function IconButton({
  label,
  icon: Icon,
  onPress,
  selected = false,
  disabled = false,
  testID,
}: any) {
  const { c } = useTheme();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ selected, disabled }}
      testID={testID}
      disabled={disabled}
      onPress={onPress}
    >
      {({ pressed }) => (
        <Glass
          level={selected ? 2 : 1}
          state={disabled ? 'disabled' : pressed ? 'pressed' : selected ? 'selected' : 'default'}
          style={{ width: 44, height: 44, borderRadius: 22 }}
        >
          <View style={s.icon}>
            <Icon size={19} color={selected ? c.accent : c.ink} strokeWidth={selected ? 2 : 1.75} />
          </View>
        </Glass>
      )}
    </Pressable>
  );
}

export function Field({ label, style, inputRef, onClear, ...props }: TextInputProps & { label: string; inputRef?: React.Ref<any>; onClear?: () => void }) {
  const [focus, setFocus] = useState(false);
  const { c } = useTheme();
  const hasValue = Boolean(props.value && String(props.value).length > 0);
  return (
    <View style={{ gap: 5 }}>
      <Copy size={11} weight="600" muted style={{ letterSpacing: 0.6, textTransform: 'uppercase' }}>
        {label}
      </Copy>
      <Glass level={1} state={focus ? 'focused' : 'default'} blur={false} style={{ borderRadius: 18 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
          <TextInput
            {...props}
            ref={inputRef}
            accessibilityLabel={label}
            placeholderTextColor={c.muted}
            underlineColorAndroid="transparent"
            onFocus={e => {
              setFocus(true);
              props.onFocus?.(e);
            }}
            onBlur={e => {
              setFocus(false);
              props.onBlur?.(e);
            }}
            style={[
              {
                flex: 1,
                color: c.ink,
                minHeight: 48,
                paddingHorizontal: 15,
                paddingVertical: 11,
                fontSize: 15,
                backgroundColor: 'transparent',
              },
              style,
            ]}
          />
          {hasValue && onClear && (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={`Clear ${label.toLowerCase()}`}
              testID="field-clear"
              onPress={onClear}
              style={{
                width: 44,
                height: 48,
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              {({ pressed }) => (
                <View style={{ opacity: pressed ? 0.6 : 1 }}>
                  <X size={17} color={c.muted} strokeWidth={2} />
                </View>
              )}
            </Pressable>
          )}
        </View>
      </Glass>
    </View>
  );
}

export function Notice({
  children,
  error = false,
}: {
  children: React.ReactNode;
  error?: boolean;
}) {
  const { c, dark } = useTheme();
  return (
    <View
      accessibilityLiveRegion="polite"
      style={{
        paddingHorizontal: 15,
        paddingVertical: 12,
        borderRadius: 16,
        backgroundColor: error
          ? (dark ? 'rgba(239, 68, 68, 0.12)' : 'rgba(239, 68, 68, 0.06)')
          : (dark ? 'rgba(74, 222, 128, 0.10)' : 'rgba(15, 23, 42, 0.04)'),
        borderWidth: 1,
        borderColor: error
          ? (dark ? 'rgba(239, 68, 68, 0.30)' : 'rgba(239, 68, 68, 0.18)')
          : (dark ? 'rgba(74, 222, 128, 0.20)' : 'rgba(15, 23, 42, 0.09)'),
      }}
    >
      <Copy size={13} style={{ color: error ? c.error : c.ink, lineHeight: 18 }}>
        {children}
      </Copy>
    </View>
  );
}

export function Badge({
  label,
  color,
  mode = 'soft',
}: {
  label: string;
  color?: string;
  mode?: 'soft' | 'outline' | 'solid';
}) {
  const { c, dark } = useTheme();
  const tintColor = color || c.accent;
  return (
    <View
      style={{
        paddingHorizontal: 8,
        paddingVertical: 3,
        borderRadius: 7,
        backgroundColor:
          mode === 'solid'
            ? tintColor
            : dark
            ? 'rgba(74, 222, 128, 0.14)'
            : 'rgba(24, 109, 78, 0.08)',
        borderWidth: mode === 'outline' ? 1 : 0,
        borderColor: tintColor,
      }}
    >
      <Copy
        size={10}
        weight="600"
        style={{
          color: mode === 'solid' ? '#ffffff' : tintColor,
          letterSpacing: 0.7,
          textTransform: 'uppercase',
        }}
      >
        {label}
      </Copy>
    </View>
  );
}

const s = StyleSheet.create({
  shadow: {
    shadowColor: '#071d14',
    shadowOffset: { width: 0, height: 3 },
  },
  surface: {
    overflow: 'hidden',
    flexGrow: 1,
    flexShrink: 1,
    minHeight: 0,
  },
  action: {
    minHeight: 48,
    paddingVertical: 11,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  icon: {
    width: '100%',
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
});
