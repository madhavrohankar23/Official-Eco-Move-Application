import React, { useState } from 'react';
import { View } from 'react-native';
import { Check, Leaf, Route } from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme } from '../theme';
import { glassChoices, glassMaterial, type GlassAppearance } from '../glassTokens';
import { Copy, Glass } from './Glass';
import { MotionPressable } from './MotionPressable';

/** Three material choices only. No new adjustment system or profile writes. */
export function GlassAppearanceSelector() {
  const t = useTheme();
  const [focused, setFocused] = useState<GlassAppearance | null>(null);
  const [hovered, setHovered] = useState<GlassAppearance | null>(null);
  return <View style={{ gap: 10 }} testID="glass-appearance">
    <View style={{ gap: 3 }}>
      <Copy size={11} weight="600" muted style={{ letterSpacing: 1.5, textTransform: 'uppercase' }}>Customization</Copy>
      <Copy size={21} weight="600">Glass Appearance</Copy>
      <Copy size={12} muted>A material for your city. Your settings stay yours.</Copy>
    </View>
    {glassChoices.map(choice => {
      const selected = t.appearance === choice.id;
      const sample = glassMaterial(choice.id, true, 0, 2);
      return <MotionPressable key={choice.id} testID={`appearance-${choice.id}`}
        accessibilityRole="button" accessibilityLabel={choice.label}
        accessibilityHint={`${choice.detail} Changes visual material only.`}
        accessibilityState={{ selected }} aria-pressed={selected}
        onPress={() => t.setAppearance(choice.id)}
        onFocus={() => setFocused(choice.id)} onBlur={() => setFocused(null)}
        onHoverIn={() => setHovered(choice.id)} onHoverOut={() => setHovered(null)}>
        {({ pressed }) => <Glass level={2} blur={false}
          state={pressed ? 'pressed' : focused === choice.id ? 'focused' : hovered === choice.id ? 'hover' : selected ? 'selected' : 'default'}
          style={{ borderRadius: 22 }}>
          <View style={{ padding: 12, flexDirection: 'row', alignItems: 'center', gap: 12, minHeight: 90 }}>
            <View accessibilityElementsHidden importantForAccessibility="no-hide-descendants" aria-hidden
              style={{ width: 64, height: 64, borderRadius: 17, overflow: 'hidden', backgroundColor: '#759a81' }}>
              <LinearGradient colors={['#c7d8a6', '#426b50', '#a7baa8']} style={{ position: 'absolute', inset: 0 }} />
              <View style={{ position: 'absolute', width: 100, height: 5, top: 28, left: -15, backgroundColor: '#eddfb3', transform: [{ rotate: '-32deg' }] }} />
              <View style={{ position: 'absolute', inset: 7, borderRadius: 13, backgroundColor: sample.tint,
                borderWidth: 1, borderColor: sample.edge, borderTopColor: sample.topEdge, alignItems: 'center', justifyContent: 'center' }}>
                <LinearGradient colors={[`rgba(230,255,240,${sample.highlight * 2})`, 'transparent']} style={{ position: 'absolute', inset: 0, borderRadius: 13 }} />
                {choice.id === 'liquid' ? <Route color="#b6f1cd" size={23} strokeWidth={1.6} /> : <Leaf color="#c3decb" size={23} strokeWidth={1.6} />}
              </View>
            </View>
            <View style={{ flex: 1, gap: 4 }}>
              <Copy size={15} weight="600">{choice.label}</Copy>
              <Copy size={12} muted>{choice.detail}</Copy>
            </View>
            <View style={{ width: 24, height: 24, borderRadius: 12, borderWidth: 1,
              borderColor: selected ? t.c.accent : t.c.line, backgroundColor: selected ? t.c.soft : 'transparent',
              alignItems: 'center', justifyContent: 'center' }}>
              {selected && <Check size={15} strokeWidth={2.2} color={t.c.accent} />}
            </View>
          </View>
        </Glass>}
      </MotionPressable>;
    })}
  </View>;
}
