import React, { createContext, useContext, useEffect, useRef, useState } from 'react';
import { AccessibilityInfo, AppState, Platform, View } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { DEFAULT_GLASS_APPEARANCE, GLASS_APPEARANCE_KEY, readGlassAppearance, type GlassAppearance } from './glassTokens';
import { preferenceWriter } from './preferenceWriter';

export const light = {
  ink: '#0e241c',
  muted: '#304b3c',
  accent: '#155239',
  accentMint: '#22c55e',
  soft: '#dceee3',
  line: '#b9d2c4',
  paper: '#f3f8f5',
  surface: '#ffffff',
  error: '#b83232',
  gold: '#b07f35',
};

export const dark = {
  ink: '#f0f9f3',
  muted: '#dcece3',
  accent: '#b6f1d0',
  accentMint: '#86efac',
  soft: '#214b38',
  line: '#537865',
  paper: '#0b1913',
  surface: '#12281f',
  error: '#f87171',
  gold: '#fbbf24',
};

export function getThemedColors(isDark: boolean, contrastLevel: number) {
  const base = isDark ? dark : light;
  const ratio = Math.max(0, Math.min(100, contrastLevel)) / 100;
  if (ratio <= 0) return base;

  if (isDark) {
    return {
      ...base,
      ink: ratio > 0.35 ? '#ffffff' : base.ink,
      muted: mixColor(base.muted, '#ffffff', ratio),
      line: mixColor(base.line, '#b7d4c4', ratio),
      soft: ratio > 0.35 ? '#1a4433' : base.soft,
      surface: ratio > 0.5 ? '#0c2217' : base.surface,
      paper: ratio > 0.5 ? '#07140e' : base.paper,
    };
  } else {
    return {
      ...base,
      ink: ratio > 0.35 ? '#000000' : base.ink,
      muted: mixColor(base.muted, '#07170f', ratio),
      line: mixColor(base.line, '#416452', ratio),
      soft: ratio > 0.35 ? '#cde6d7' : base.soft,
      surface: ratio > 0.5 ? '#ffffff' : base.surface,
      paper: ratio > 0.5 ? '#fcfdfc' : base.paper,
    };
  }
}

function mixColor(from: string, to: string, ratio: number) {
  return '#' + [1, 3, 5].map(i => Math.round(parseInt(from.slice(i,i+2),16) * (1-ratio) + parseInt(to.slice(i,i+2),16) * ratio).toString(16).padStart(2,'0')).join('');
}

export type Theme = {
  c: typeof light;
  dark: boolean;
  setDark: (v: boolean) => void;
  appearance: GlassAppearance;
  setAppearance: (v: GlassAppearance) => void;
  reduceMotion: boolean;
  contrast: boolean;
  contrastLevel: number; // System accessibility only; no app contrast control.
  active: boolean;
  blurRef: React.RefObject<any>;
};

const Context = createContext<Theme>(null!);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  // Start with the signature forest-green appearance. The existing light/dark
  // control remains independent of material selection.
  const [isDark, setDark] = useState(true);
  const [appearance, setAppearanceState] = useState<GlassAppearance>(DEFAULT_GLASS_APPEARANCE);
  const [appearanceReady, setAppearanceReady] = useState(false);
  const appearanceWrites = useRef(preferenceWriter(value => AsyncStorage.setItem(GLASS_APPEARANCE_KEY, value)));
  const [reduceMotion, setReduceMotion] = useState(false);
  const [systemTransparency, setSystemTransparency] = useState(false);
  // The removed app slider no longer overrides presets, including old saved
  // values. Leave its legacy storage key untouched; unrelated preferences stay intact.
  const contrastLevel = systemTransparency ? 100 : 0;
  const [active, setActive] = useState(true);
  const blurRef = useRef<any>(null);

  const setAppearance = (value: GlassAppearance) => {
    const next = readGlassAppearance(value);
    setAppearanceState(next);
    // Only the material key is written; rapid taps preserve the last selection.
    appearanceWrites.current.set(next);
  };

  useEffect(() => {
    let mounted = true;
    Promise.all([AsyncStorage.getItem(GLASS_APPEARANCE_KEY).catch(() => null), AccessibilityInfo.isReduceMotionEnabled().catch(() => false), Platform.OS === 'ios' ? AccessibilityInfo.isReduceTransparencyEnabled().catch(() => false) : Promise.resolve(false)]).then(([appearance, motion, transparency]) => {
      if (!mounted) return;
      setAppearanceState(readGlassAppearance(appearance));
      setReduceMotion(motion); setSystemTransparency(transparency);
    }).catch(() => {}).finally(() => { if (mounted) setAppearanceReady(true); });
    return () => { mounted = false; };
  }, []);

  useEffect(() => {
    // System accessibility takes precedence without overwriting the saved choice.
    const a = AccessibilityInfo.addEventListener('reduceMotionChanged', setReduceMotion);
    const transparency =
      Platform.OS === 'ios'
        ? AccessibilityInfo.addEventListener('reduceTransparencyChanged', setSystemTransparency)
        : undefined;
    const b = AppState.addEventListener('change', s => { setActive(s === 'active'); if (s !== 'active') void appearanceWrites.current.flush().catch(() => {}); });
    return () => {
      void appearanceWrites.current.flush().catch(() => {});
      a.remove();
      transparency?.remove();
      b.remove();
    };
  }, []);

  const contrast = contrastLevel >= 50;
  const colors = getThemedColors(isDark, contrastLevel);

  return (
    <Context.Provider
      value={{
        c: colors,
        dark: isDark,
        setDark,
        appearance,
        setAppearance,
        reduceMotion,
        contrast,
        contrastLevel,
        active,
        blurRef,
      }}
    >
      {appearanceReady ? children : <View style={{ flex: 1, backgroundColor: dark.paper }} />}
    </Context.Provider>
  );
}

export const useTheme = () => useContext(Context);
