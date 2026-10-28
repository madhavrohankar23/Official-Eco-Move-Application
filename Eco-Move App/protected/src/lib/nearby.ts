/**
 * Utility: find bus stops and metro stations near a geographic anchor.
 * Uses the same datasets as the route planner — no hardcoded data.
 *
 * NOTE: haversine() in network.ts uses EARTH_R = 6_371_000 m so it returns
 * distances in METRES directly.
 */
import { haversine } from "@/lib/network";
import { busStops, metroStations, allLines } from "@/lib/routing";

export interface NearbyStop {
  id: string;
  name: string;
  lat: number;
  lon: number;
  mode: "bus" | "metro";
  /** Parent metro line name e.g. "Blue Line" / "Orange Line" — only for metro stations */
  lineName?: string;
  /** Distance from anchor in metres */
  distM: number;
  /** Estimated walk time in minutes at ~4.8 km/h */
  walkMin: number;
}

export interface NearbyResult {
  busStops: NearbyStop[];
  metroStations: NearbyStop[];
}

/** Walking speed estimate: 4.8 km/h = 80 metres per minute */
const WALK_MPM = 80;

// Lazy pre-computed metro station parent line cache
let metroLineCache: Map<string, string> | null = null;
function getMetroStationLine(s: { id: string; lat: number; lon: number }): string | undefined {
  if (!metroLineCache) {
    metroLineCache = new Map();
    for (const stn of metroStations) {
      const parentLine = allLines.find(
        (l) =>
          l.mode === "metro" &&
          l.points.some(
            (p: { lat: number; lon: number }) =>
              Math.abs(p.lat - stn.lat) < 0.0005 && Math.abs(p.lon - stn.lon) < 0.0005,
          ),
      );
      if (parentLine?.name) {
        metroLineCache.set(stn.id, parentLine.name);
      }
    }
  }
  return metroLineCache.get(s.id);
}

/**
 * Returns the nearest bus stops and metro stations from a given anchor point,
 * sorted by distance ascending within the specified search radius (in metres).
 * Uses bounding-box pre-filtering for sub-millisecond query performance.
 */
export function findNearby(
  anchor: { lat: number; lon: number },
  searchRadiusM = 2500,
): NearbyResult {
  if (!anchor || typeof anchor.lat !== "number" || typeof anchor.lon !== "number") {
    return { busStops: [], metroStations: [] };
  }

  const maxBusM = searchRadiusM;
  const maxMetroM = searchRadiusM;

  // Fast bounding-box pre-filter: 1 deg lat ≈ 111,000m. 10% safety margin.
  const maxDLat = (searchRadiusM / 111000) * 1.1;
  const cosLat = Math.cos((anchor.lat * Math.PI) / 180);
  const maxDLon = (searchRadiusM / (111000 * Math.max(0.1, cosLat))) * 1.1;

  // 1. Calculate distances to candidate bus stops within bounding box
  const resultBus: NearbyStop[] = [];
  for (let i = 0; i < busStops.length; i++) {
    const s = busStops[i]!;
    if (Math.abs(s.lat - anchor.lat) > maxDLat) continue;
    if (Math.abs(s.lon - anchor.lon) > maxDLon) continue;

    const distM = Math.round(haversine(anchor.lat, anchor.lon, s.lat, s.lon));
    if (distM <= maxBusM) {
      resultBus.push({
        id: s.id,
        name: s.name,
        lat: s.lat,
        lon: s.lon,
        mode: "bus" as const,
        distM,
        walkMin: Math.max(1, Math.ceil(distM / WALK_MPM)),
      });
    }
  }
  resultBus.sort((a, b) => a.distM - b.distM);

  // 2. Calculate distances to candidate metro stations within bounding box
  const resultMetro: NearbyStop[] = [];
  for (let i = 0; i < metroStations.length; i++) {
    const s = metroStations[i]!;
    if (Math.abs(s.lat - anchor.lat) > maxDLat) continue;
    if (Math.abs(s.lon - anchor.lon) > maxDLon) continue;

    const distM = Math.round(haversine(anchor.lat, anchor.lon, s.lat, s.lon));
    if (distM <= maxMetroM) {
      const lineName = getMetroStationLine(s);
      resultMetro.push({
        id: s.id,
        name: s.name,
        lat: s.lat,
        lon: s.lon,
        mode: "metro" as const,
        ...(lineName ? { lineName } : {}),
        distM,
        walkMin: Math.max(1, Math.ceil(distM / WALK_MPM)),
      });
    }
  }
  resultMetro.sort((a, b) => a.distM - b.distM);

  return {
    busStops: resultBus,
    metroStations: resultMetro,
  };
}

/** Formats distance: e.g. "420 m" or "1.4 km" */
export function fmtNearbyDist(m: number): string {
  if (m < 1000) {
    return `${m} m`;
  }
  return `${(m / 1000).toFixed(1)} km`;
}
