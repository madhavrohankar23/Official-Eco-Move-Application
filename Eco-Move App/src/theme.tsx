import React, { createContext, useContext, useEffect, useRef, useState } from 'react';
import { AccessibilityInfo, AppState, Platform, View } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { DEFAULT_GLASS_APPEARANCE, GLASS_APPEARANCE_KEY, readGlassAppearance, type GlassAppearance } from './glassTokens';
import { preferenceWriter } from './preferenceWriter';

export const light = {
  ink: '#0f172a',
  muted: '#334155',
  accent: '#124831',
  accentMint: '#16a34a',
  soft: '#f1f5f9',
  line: '#e2e8f0',
  paper: '#f8fafc',
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
  paper: '#071015',
  surface: '#142124',
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
      muted: mixColor(base.muted, '#0f172a', ratio),
      line: mixColor(base.line, '#475569', ratio),
      soft: ratio > 0.35 ? '#e2e8f0' : base.soft,
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
const NIGHT_MODE_KEY = '@eco.theme.night_mode';

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  // Appearance remains independent of the three existing material choices.
  const [isDark, setDarkState] = useState(false);
  const [appearance, setAppearanceState] = useState<GlassAppearance>(DEFAULT_GLASS_APPEARANCE);
  const [appearanceReady, setAppearanceReady] = useState(false);
  const appearanceWrites = useRef(preferenceWriter(value => AsyncStorage.setItem(GLASS_APPEARANCE_KEY, value)));
  const nightWrites = useRef(preferenceWriter(value => AsyncStorage.setItem(NIGHT_MODE_KEY, value)));
  const setDark = (value: boolean) => {
    setDarkState(value);
    nightWrites.current.set(String(value));
  };
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
    Promise.all([AsyncStorage.getItem(GLASS_APPEARANCE_KEY).catch(() => null), AccessibilityInfo.isReduceMotionEnabled().catch(() => false), Platform.OS === 'ios' ? AccessibilityInfo.isReduceTransparencyEnabled().catch(() => false) : Promise.resolve(false), AsyncStorage.getItem(NIGHT_MODE_KEY).catch(() => null)]).then(([appearance, motion, transparency, night]) => {
      if (!mounted) return;
      setAppearanceState(readGlassAppearance(appearance));
      setDarkState(night === 'true');
      setReduceMotion(motion); setSystemTransparency(transparency);
    }).catch(() => {}).finally(() => { if (mounted) setAppearanceReady(true); });
    return () => { mounted = false; };
  }, []);

  useEffect(() => {
    // System accessibility takes precedence without overwriting the saved choice.
    const materialWriter = appearanceWrites.current;
    const nightWriter = nightWrites.current;
    const a = AccessibilityInfo.addEventListener('reduceMotionChanged', setReduceMotion);
    const transparency =
      Platform.OS === 'ios'
        ? AccessibilityInfo.addEventListener('reduceTransparencyChanged', setSystemTransparency)
        : undefined;
    const b = AppState.addEventListener('change', s => { setActive(s === 'active'); if (s !== 'active') { void materialWriter.flush().catch(() => {}); void nightWriter.flush().catch(() => {}); } });
    return () => {
      void materialWriter.flush().catch(() => {});
      void nightWriter.flush().catch(() => {});
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
      {appearanceReady ? children : <View style={{ flex: 1, backgroundColor: light.paper }} />}
    </Context.Provider>
  );
}

export const useTheme = () => useContext(Context);
