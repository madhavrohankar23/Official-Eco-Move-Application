/** Material-only presets. System accessibility can strengthen any material. */
export type GlassAppearance = 'liquid' | 'matte' | 'solid';
export type GlassLevel = 1 | 2 | 3 | 4;
export const GLASS_APPEARANCE_KEY = '@eco.theme.glass_appearance';
export const DEFAULT_GLASS_APPEARANCE: GlassAppearance = 'liquid';
export const glassChoices = [
  { id: 'liquid', label: 'Liquid Glass', detail: 'Luminous emerald. Light in motion.' },
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
    dark: '9, 38, 29', light: '244, 251, 246',
    opacity: [.84, .85, .87, .90], fallback: [.88, .90, .92, .96],
    nested: [.02, .035, .05, .075], blur: [38, 48, 58, 64],
    edge: .22, topEdge: .46, highlight: .055, reflection: .045,
    shadow: .21, saturation: 1.22, selection: .07,
  },
  matte: {
    dark: '26, 45, 37', light: '231, 239, 232',
    opacity: [.965, .97, .98, .985], fallback: [.985, .99, 1, 1],
    nested: [.025, .04, .055, .075], blur: [48, 56, 64, 72],
    edge: .14, topEdge: .22, highlight: .022, reflection: 0,
    shadow: .14, saturation: .82, selection: .075,
  },
  solid: {
    dark: '13, 40, 29', light: '240, 247, 241',
    opacity: [1, 1, 1, 1], fallback: [1, 1, 1, 1],
    nested: [.04, .065, .09, .12], blur: [0, 0, 0, 0],
    edge: .26, topEdge: .32, highlight: .035, reflection: 0,
    shadow: .24, saturation: 1, selection: .12,
  },
} as const;

export function glassMaterial(appearance: GlassAppearance, dark: boolean, contrastLevel: number,
  level: GlassLevel, nested = false, backdropAvailable = true) {
  const preset = presets[appearance];
  const contrast = Math.max(0, Math.min(100, Number.isFinite(contrastLevel) ? contrastLevel : 0)) / 100;
  const opaque = contrast >= .85;
  const rgb = nested ? (dark ? '190, 231, 209' : '16, 68, 44') : dark ? preset.dark : preset.light;
  const base = nested ? preset.nested[level - 1] : (backdropAvailable ? preset.opacity : preset.fallback)[level - 1];
  // Nested cards inherit their parent's opaque material; do not stack opaque rectangles.
  const opacity = nested ? base * (1 - contrast * .3) : opaque ? 1 : base + (1 - base) * contrast;
  const highlight = preset.highlight * (1 - contrast) * (nested ? .35 : 1);
  return {
    rgb, opacity, tint: `rgba(${rgb}, ${opacity})`,
    blur: nested || opaque ? 0 : Math.round(preset.blur[level - 1] * (1 - contrast * .5)),
    saturation: preset.saturation,
    edge: `rgba(${dark ? '204, 242, 221' : '23, 75, 51'}, ${preset.edge + contrast * .16})`,
    topEdge: `rgba(${dark ? '226, 255, 238' : '255, 255, 255'}, ${preset.topEdge + contrast * .12})`,
    highlight, reflection: opaque ? 0 : preset.reflection * (1 - contrast),
    selection: `rgba(${dark ? '94, 222, 159' : '20, 111, 71'}, ${preset.selection})`,
    shadowOpacity: nested || level === 1 ? 0 : preset.shadow + (level - 2) * .025,
    shadowRadius: appearance === 'matte' ? 16 : 12 + level * 3,
    flowing: appearance === 'liquid' && contrast < .6,
  };
}
