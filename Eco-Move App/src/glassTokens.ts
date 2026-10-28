/** Material-only presets. System accessibility can strengthen any material. */
export type GlassAppearance = 'liquid' | 'matte' | 'solid';
export type GlassLevel = 1 | 2 | 3 | 4;
export const GLASS_APPEARANCE_KEY = '@eco.theme.glass_appearance';
export const DEFAULT_GLASS_APPEARANCE: GlassAppearance = 'liquid';
export const glassChoices = [
  { id: 'liquid', label: 'Liquid Glass', detail: 'Clear depth. Light in motion.' },
  { id: 'matte', label: 'Matte Glass', detail: 'Opaque frost. Soft, quiet depth.' },
  { id: 'solid', label: 'Solid Glass', detail: 'Deep green. Defined and clear.' },
] as const;

export function readGlassAppearance(value: unknown): GlassAppearance {
  return value === 'matte' || value === 'solid' ? value : DEFAULT_GLASS_APPEARANCE;
}

export const glassGeometry = {
  radius: { control: 20, card: 24, sheet: 32, capsule: 26 },
  space: { small: 8, medium: 12, inset: 18, section: 20 },
  motion: { feedback: 160, selection: 180, material: 220, reflection: 11000 },
} as const;

const presets = {
  liquid: {
    dark: '7, 15, 19', light: '255, 255, 252',
    opacity: [.70, .70, .80, .90], fallback: [.94, .95, .97, .98],
    nested: [.015, .025, .035, .05], blur: [20, 24, 28, 32],
    edge: .30, topEdge: .72, highlight: .065, reflection: .035,
    shadow: .14, saturation: 1.12, selection: .06,
  },
  matte: {
    dark: '27, 35, 35', light: '236, 240, 235',
    opacity: [.965, .97, .98, .985], fallback: [.985, .99, 1, 1],
    nested: [.025, .04, .055, .075], blur: [48, 56, 64, 72],
    edge: .14, topEdge: .22, highlight: .022, reflection: 0,
    shadow: .14, saturation: .82, selection: .075,
  },
  solid: {
    dark: '16, 27, 26', light: '248, 249, 245',
    opacity: [1, 1, 1, 1], fallback: [1, 1, 1, 1],
    nested: [.04, .065, .09, .12], blur: [0, 0, 0, 0],
    edge: .26, topEdge: .32, highlight: .035, reflection: 0,
    shadow: .24, saturation: 1, selection: .12,
  },
} as const;

export function glassMaterial(appearance: GlassAppearance, dark: boolean, contrastLevel: number,
  level: GlassLevel, nested = false, backdropAvailable = true) {
  // Light appearance is a consistent matte-white surface. Saved night material
  // preferences stay intact; no glossy layers or expensive blur are needed here.
  if (!dark) {
    const rgb = nested ? '245, 247, 245' : '253, 253, 250';
    return {
      rgb, opacity: 1, tint: `rgba(${rgb}, 1)`, blur: 0, saturation: 1,
      edge: '#d3d9d5', topEdge: '#d3d9d5', highlight: 0, reflection: 0,
      selection: 'rgba(20, 111, 71, .055)',
      shadowOpacity: nested ? 0 : level === 1 ? .10 : level === 2 ? .18 : .22,
      shadowRadius: level === 1 ? 8 : 16, flowing: false,
    };
  }
  const preset = presets[appearance];
  const contrast = Math.max(0, Math.min(100, Number.isFinite(contrastLevel) ? contrastLevel : 0)) / 100;
  const opaque = contrast >= .85;
  const rgb = nested ? (dark ? '190, 231, 209' : '16, 68, 44') : dark ? preset.dark : preset.light;
  const presetOpacity = (backdropAvailable ? preset.opacity : preset.fallback)[level - 1];
  // Dark controls need stronger backing over bright tiles to keep secondary text legible.
  const base = nested ? preset.nested[level - 1] : Math.min(1, presetOpacity + (dark && appearance === 'liquid' ? .06 : 0));
  // Nested cards inherit their parent's opaque material; do not stack opaque rectangles.
  const opacity = nested ? base * (1 - contrast * .3) : opaque ? 1 : base + (1 - base) * contrast;
  const highlight = preset.highlight * (1 - contrast) * (nested ? .35 : 1);
  return {
    rgb, opacity, tint: `rgba(${rgb}, ${opacity})`,
    blur: nested || opaque ? 0 : Math.round(preset.blur[level - 1] * (1 - contrast * .5)),
    saturation: preset.saturation,
    edge: `rgba(${dark ? '218, 231, 230' : '255, 255, 255'}, ${preset.edge + contrast * .16})`,
    topEdge: `rgba(${dark ? '226, 255, 238' : '255, 255, 255'}, ${preset.topEdge + contrast * .12})`,
    highlight, reflection: opaque ? 0 : preset.reflection * (1 - contrast),
    selection: `rgba(${dark ? '94, 222, 159' : '20, 111, 71'}, ${preset.selection})`,
    shadowOpacity: nested || level === 1 ? 0 : preset.shadow + (level - 2) * .025,
    shadowRadius: appearance === 'matte' ? 16 : 12 + level * 3,
    flowing: appearance === 'liquid' && contrast < .6,
  };
}
