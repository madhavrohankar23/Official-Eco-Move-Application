import type {Journey, Leg} from '../../../protected/src/lib/routing';

// Reference palette and line hierarchy, shared by paths and stop markers.
export function routeStyle(leg: Leg, index: number, journey: Journey, safe: boolean) {
  const walk = leg.mode === 'walk';
  const transfer = walk && (leg.isTransfer || (index > 0 && index < journey.legs.length - 1 &&
    ((journey.legs[index - 1]?.mode !== 'walk' && journey.legs[index + 1]?.mode !== 'walk') || leg.distanceM <= 250)));
  const color = walk ? (transfer ? (safe ? '#6366f1' : '#8b5cf6') : (safe ? '#10b981' : '#0284c7'))
    : leg.mode === 'drive' ? (safe ? '#b45309' : '#991b1b')
    : leg.mode === 'bus' ? (safe ? '#047857' : '#0d9488')
    : leg.line === 'Blue Line' ? (safe ? '#2563eb' : '#00aaff')
    : leg.line === 'Orange Line' ? (safe ? '#d97706' : '#ff6a00') : (safe ? '#d97706' : '#e07a1f');
  return {color, weight: transfer ? 4 : walk ? 4.5 : leg.mode === 'drive' ? 5.5 : 6,
    casingWeight: transfer ? 5 : walk ? 6.5 : leg.mode === 'drive' ? 8.5 : 9.5,
    dashArray: transfer ? '4 6' : walk ? '3 8' : undefined};
}
