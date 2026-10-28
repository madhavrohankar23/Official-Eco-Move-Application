import React, { useCallback, useEffect, useRef } from "react";
import { useMap } from "react-leaflet";
import L from "leaflet";
import type { Journey, Leg } from "@/lib/routing";
import type { FlyThroughState, TransferInfo } from "../../../src/features/routing/previewTypes";
import { generateTurnByTurnSteps, type NavigationStep } from "@/lib/turnByTurn";

interface RouteFlyThroughControllerProps {
  journey: Journey;
  isPlaying: boolean;
  speed: 1 | 2 | 4;
  restartCounter: number;
  seekProgress?: number | null | undefined;
  onUpdateState: (state: Partial<FlyThroughState>) => void;
  onFinished: () => void;
}

/**
 * ────────────────────────────────────────────────────────────────────────────
 * ⚙️ TRAVEL SPEED MULTIPLIERS (MANUAL SPEED TUNING)
 * ────────────────────────────────────────────────────────────────────────────
 * Adjust these numbers to manually control how fast or slow each mode travels:
 * - 'walk': 0.38 (set lower like 0.25 to make walking even slower, or 0.60 to speed up)
 * - 'bus': 1.00 (standard Aapli Bus cruise speed)
 * - 'metro': 1.30 (high-speed dedicated rail corridor)
 * - 'drive': 1.10 (cab / car direct route)
 * ────────────────────────────────────────────────────────────────────────────
 */
const MODE_SPEED_MULTIPLIERS: Record<"walk" | "bus" | "metro" | "drive", number> = {
  walk: 0.3, // 🚶 Walking speed multiplier — change this number to adjust walking speed!
  bus: 1.0, // 🚌 Aapli Bus speed multiplier
  metro: 1.3, // 🚇 Maha Metro speed multiplier
  drive: 1.1, // 🚗 Direct Driving speed multiplier
};

interface PathSegment {
  from: { lat: number; lon: number };
  to: { lat: number; lon: number };
  distM: number;
  startCumDist: number;
  endCumDist: number;
  legIndex: number;
  leg: Leg;
  mode: "walk" | "bus" | "metro" | "drive";
  zoom: number;
  bearing: number;
}

interface TransferNode {
  distM: number;
  lat: number;
  lon: number;
  stationName: string;
  fromLegIndex: number;
  toLegIndex: number;
  deboardMode: "walk" | "bus" | "metro" | "drive";
  deboardText: string;
  boardMode: "walk" | "bus" | "metro" | "drive";
  boardText: string;
  nextDestination: string;
  triggered: boolean;
}

interface LegPathVertex {
  lat: number;
  lon: number;
  cumDist: number;
}

interface DynamicLegLayer {
  legIndex: number;
  vertices: LegPathVertex[];
  startDist: number;
  endDist: number;
  startTimeMin: number;
  endTimeMin: number;
  traversedCasing: L.Polyline;
  traversedCore: L.Polyline;
  remainingCasing: L.Polyline;
  remainingCore: L.Polyline;
  remainingFlow?: L.Polyline | undefined;
}

function formatLegModeLabel(leg: Leg): string {
  if (leg.mode === "bus") {
    if (leg.busNumber) return `Aapli Bus ${leg.busNumber}`;
    if (leg.line) return leg.line.startsWith("Aapli") ? leg.line : `Aapli Bus (${leg.line})`;
    return "Aapli Bus";
  }
  if (leg.mode === "metro") {
    if (leg.line) return leg.line.startsWith("Maha") ? leg.line : `Maha Metro ${leg.line}`;
    return "Maha Metro";
  }
  if (leg.mode === "drive") {
    return "Direct Cab / Drive";
  }
  return "Walk on Foot";
}

function haversineDistM(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371000;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

function calculateBearing(
  p1: { lat: number; lon: number },
  p2: { lat: number; lon: number },
): number {
  const dLon = ((p2.lon - p1.lon) * Math.PI) / 180;
  const lat1 = (p1.lat * Math.PI) / 180;
  const lat2 = (p2.lat * Math.PI) / 180;
  const y = Math.sin(dLon) * Math.cos(lat2);
  const x = Math.cos(lat1) * Math.sin(lat2) * Math.cos(dLon) - Math.sin(lat1) * Math.cos(lat2);
  const brng = (Math.atan2(y, x) * 180) / Math.PI;
  return (brng + 360) % 360;
}

function unwrapAngle(current: number, target: number): number {
  let diff = (target - current) % 360;
  if (diff > 180) diff -= 360;
  if (diff < -180) diff += 360;
  return current + diff;
}

const beaconIconCache = new Map<string, L.DivIcon>();

function createFlyThroughBeaconIcon(mode: string, lineName: string): L.DivIcon {
  const isAqua = lineName.toLowerCase().includes("aqua") || lineName.toLowerCase().includes("blue");
  const cacheKey = `${mode}_${lineName}_${isAqua ? 1 : 0}`;
  const cached = beaconIconCache.get(cacheKey);
  if (cached) return cached;

  let iconHtml = `<span style="font-size: 19px; line-height: 1; display: flex; align-items: center; justify-content: center;">🚶</span>`;
  let grad = "#10b981, #059669";
  let glowColor = "rgba(16, 185, 129, 0.45)";

  if (mode === "metro") {
    grad = isAqua ? "#00aaff, #0077cc" : "#ff6a00, #d95500";
    glowColor = isAqua ? "rgba(0, 170, 255, 0.45)" : "rgba(255, 106, 0, 0.45)";
    iconHtml = `
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#ffffff" stroke-width="2.3" stroke-linecap="round" stroke-linejoin="round" style="display: block;">
        <rect width="16" height="15" x="4" y="3" rx="2" />
        <path d="M4 10h16" />
        <path d="M12 3v7" />
        <path d="m8 18-2 3" />
        <path d="m18 21-2-3" />
        <circle cx="8" cy="14" r="1.5" fill="#ffffff" />
        <circle cx="16" cy="14" r="1.5" fill="#ffffff" />
      </svg>
    `;
  } else if (mode === "bus") {
    grad = "#0d9488, #047857";
    glowColor = "rgba(13, 148, 136, 0.45)";
    iconHtml = `
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#ffffff" stroke-width="2.3" stroke-linecap="round" stroke-linejoin="round" style="display: block;">
        <rect width="16" height="16" x="4" y="3" rx="2" />
        <path d="M4 11h16" />
        <path d="M10 6h4" />
        <circle cx="8" cy="15" r="1.5" fill="#ffffff" />
        <circle cx="16" cy="15" r="1.5" fill="#ffffff" />
        <path d="M6 19v2" />
        <path d="M18 19v2" />
      </svg>
    `;
  } else if (mode === "drive") {
    grad = "#334155, #0f172a";
    glowColor = "rgba(51, 65, 85, 0.45)";
    iconHtml = `
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#ffffff" stroke-width="2.3" stroke-linecap="round" stroke-linejoin="round" style="display: block;">
        <path d="M19 17h2c.6 0 1-.4 1-1v-3c0-.9-.7-1.7-1.5-1.9C18.7 10.6 16 10 16 10s-1.3-1.4-2.2-2.3c-.5-.4-1.1-.7-1.8-.7H5c-.6 0-1.1.4-1.4.9l-1.4 2.9A3.7 3.7 0 0 0 2 12v4c0 .6.4 1 1 1h2" />
        <circle cx="7" cy="17" r="1.8" fill="#ffffff" />
        <path d="M9 17h6" />
        <circle cx="17" cy="17" r="1.8" fill="#ffffff" />
      </svg>
    `;
  }

  const icon = L.divIcon({
    className: "flythrough-beacon-marker",
    html: `
      <div style="position: relative; width: 44px; height: 44px; display: flex; align-items: center; justify-content: center;">
        <!-- Directional pointer heading along the road (rotates with road bearing) -->
        <div class="flythrough-beacon-pointer" style="position: absolute; inset: 0; display: flex; justify-content: center; transform: rotate(var(--beacon-pointer-rot, 0deg)); transform-origin: center center; pointer-events: none;">
          <div style="width: 0; height: 0; border-left: 6px solid transparent; border-right: 6px solid transparent; border-bottom: 10px solid #ffffff; filter: drop-shadow(0 2px 3px rgba(0,0,0,0.6)); margin-top: -6px; z-index: 10;"></div>
        </div>
        <!-- Pulsing radar glow -->
        <div style="position: absolute; inset: -3px; border-radius: 9999px; background: ${glowColor}; animation: pulse 1.8s ease-in-out infinite;"></div>
        <!-- 3D Puck Base -->
        <div style="width: 36px; height: 36px; border-radius: 9999px; background: linear-gradient(135deg, ${grad}); border: 2.5px solid #ffffff; box-shadow: 0 4px 14px rgba(0,0,0,0.35); display: flex; align-items: center; justify-content: center; z-index: 5;">
          <!-- Transit mode icon: counter-rotated so it is ALWAYS upright facing the user -->
          <div class="flythrough-inner-icon" style="display: flex; align-items: center; justify-content: center; transform: rotate(var(--beacon-icon-rot, 0deg)); transform-origin: center center;">
            ${iconHtml}
          </div>
        </div>
      </div>
    `,
    iconSize: [44, 44],
    iconAnchor: [22, 22],
  });

  beaconIconCache.set(cacheKey, icon);
  return icon;
}

export default function RouteFlyThroughController({
  journey,
  isPlaying,
  speed,
  restartCounter,
  seekProgress,
  onUpdateState,
  onFinished,
}: RouteFlyThroughControllerProps) {
  const map = useMap();
  const lastRoutePaint = useRef(0);
  const markerRef = useRef<L.Marker | null>(null);
  const segmentsRef = useRef<PathSegment[]>([]);
  const transfersRef = useRef<TransferNode[]>([]);
  const dwellUntilTimeRef = useRef<number>(0);
  const activeTransferRef = useRef<TransferNode | null>(null);
  const totalDistRef = useRef<number>(0);
  const currentDistRef = useRef<number>(0);
  const animFrameRef = useRef<number | null>(null);
  const lastTimeRef = useRef<number | null>(null);
  const lastEmittedLegRef = useRef<number>(-1);
  const lastEmittedSecRef = useRef<number>(0);
  const lastActiveModeRef = useRef<string>("");
  const currentRotationRef = useRef<number>(0);
  const tbtStepsRef = useRef<NavigationStep[]>([]);
  const lastEmittedTbtIdxRef = useRef<number>(-1);

  // Dynamic route layers (traversed gray blurred + upcoming active transit flow)
  const dynamicLegsRef = useRef<DynamicLegLayer[]>([]);
  const routeLayersGroupRef = useRef<L.LayerGroup | null>(null);
  const updatePolylinesRef = useRef<
    ((curDist: number, curPoint?: [number, number]) => void) | null
  >(null);

  const calcElapsedTimeMin = useCallback(
    (dist: number): number => {
      const totalDist = totalDistRef.current;
      const totalJourneyTimeMin = Math.round(journey.totalTimeMin);
      if (dist <= 0) return 0;
      if (dist >= totalDist) return totalJourneyTimeMin;

      const legs = dynamicLegsRef.current;
      if (!legs || legs.length === 0) {
        return Math.min(totalJourneyTimeMin, Math.round((dist / totalDist) * totalJourneyTimeMin));
      }

      const activeLeg =
        legs.find((l) => dist >= l.startDist && dist <= l.endDist) || legs[legs.length - 1]!;

      const distSpan = activeLeg.endDist - activeLeg.startDist;
      if (distSpan <= 0) return Math.round(activeLeg.startTimeMin);

      const frac = Math.max(0, Math.min(1, (dist - activeLeg.startDist) / distSpan));
      const exactMin =
        activeLeg.startTimeMin + frac * (activeLeg.endTimeMin - activeLeg.startTimeMin);
      return Math.min(totalJourneyTimeMin, Math.max(0, Math.round(exactMin)));
    },
    [journey.totalTimeMin],
  );

  const getTbtStepInfo = useCallback((curDist: number) => {
    const steps = tbtStepsRef.current;
    if (!steps || steps.length === 0) {
      return { activeIndex: 0, distToNextM: 0 };
    }
    let activeIndex = steps.length - 1;
    for (let i = 0; i < steps.length; i++) {
      const step = steps[i]!;
      // Find first upcoming step whose target maneuver point is ahead of vehicle (with 12m threshold)
      if (curDist < step.cumDistanceEndM - 12) {
        activeIndex = i;
        break;
      }
    }
    const activeStep = steps[activeIndex] || steps[steps.length - 1]!;
    const distToNextM = Math.max(0, activeStep.cumDistanceEndM - curDist);
    return { activeIndex, distToNextM };
  }, []);

  // 1. Build continuous path segments across all legs & record transfer nodes
  useEffect(() => {
    tbtStepsRef.current = generateTurnByTurnSteps(journey);
    const segments: PathSegment[] = [];
    let cumDist = 0;

    journey.legs.forEach((leg, legIndex) => {
      const path = leg.path || [];
      if (path.length < 2) return;

      const zoom =
        leg.mode === "walk"
          ? 17.25
          : leg.mode === "metro"
            ? 16.25
            : leg.mode === "bus"
              ? 16.0
              : 16.0;

      for (let i = 0; i < path.length - 1; i++) {
        const p1 = path[i]!;
        const p2 = path[i + 1]!;
        const d = haversineDistM(p1.lat, p1.lon, p2.lat, p2.lon);
        if (d <= 0.5) continue; // skip degenerate points

        const bearing = calculateBearing(p1, p2);
        segments.push({
          from: p1,
          to: p2,
          distM: d,
          startCumDist: cumDist,
          endCumDist: cumDist + d,
          legIndex,
          leg,
          mode: leg.mode,
          zoom,
          bearing,
        });
        cumDist += d;
      }
    });

    segmentsRef.current = segments;
    totalDistRef.current = Math.max(1, cumDist);
    currentDistRef.current = 0;
    lastTimeRef.current = null;
    lastEmittedLegRef.current = -1;
    lastEmittedTbtIdxRef.current = -1;
    lastActiveModeRef.current = segments[0]
      ? `${segments[0].mode}_${segments[0].leg.line || ""}`
      : "";

    // ── Build dynamic route polylines for real-time traversed (gray blurred) vs upcoming route tracking ──
    if (routeLayersGroupRef.current) {
      routeLayersGroupRef.current.remove();
      routeLayersGroupRef.current = null;
    }
    const routeGroup = L.layerGroup().addTo(map);
    routeLayersGroupRef.current = routeGroup;

    const dynamicLegs: DynamicLegLayer[] = [];
    let runDist = 0;
    let runTimeMin = 0;

    journey.legs.forEach((leg, legIndex) => {
      const path = leg.path || [];
      if (path.length < 2) return;

      const legStartDist = runDist;
      const legStartTimeMin = runTimeMin;
      const vertices: LegPathVertex[] = [
        { lat: path[0]!.lat, lon: path[0]!.lon, cumDist: runDist },
      ];

      for (let i = 0; i < path.length - 1; i++) {
        const p1 = path[i]!;
        const p2 = path[i + 1]!;
        const d = haversineDistM(p1.lat, p1.lon, p2.lat, p2.lon);
        runDist += d;
        vertices.push({ lat: p2.lat, lon: p2.lon, cumDist: runDist });
      }

      runTimeMin += leg.timeMin || 0;

      const isWalk = leg.mode === "walk";
      const isDrive = leg.mode === "drive";
      const isMetro = leg.mode === "metro";
      const isAqua =
        leg.line?.toLowerCase().includes("aqua") || leg.line?.toLowerCase().includes("blue");
      const color = isDrive
        ? "#991b1b"
        : isMetro
          ? isAqua
            ? "#00aaff"
            : "#ff6a00"
          : leg.mode === "bus"
            ? "#0d9488"
            : "#0284c7";

      // 1. Traversed Casing (subtle gray outline)
      const traversedCasing = L.polyline([], {
        color: "#cbd5e1",
        weight: isWalk ? 6.5 : isDrive ? 8 : 9,
        opacity: 0.5,
        lineCap: "round",
        lineJoin: "round",
        className: "traversed-route-casing",
        interactive: false,
      }).addTo(routeGroup);

      // 2. Traversed Core (gray blurred passed path matching Google Maps navigation)
      const traversedCore = L.polyline([], {
        color: "#94a3b8",
        weight: isWalk ? 4 : isDrive ? 5.5 : 6,
        opacity: 0.52,
        dashArray: isWalk ? "3 8" : undefined,
        lineCap: "round",
        lineJoin: "round",
        className: "traversed-route-path",
        interactive: false,
      }).addTo(routeGroup);

      // 3. Remaining Casing (crisp white outline with 3D drop shadow)
      const remainingCasing = L.polyline([], {
        color: "#ffffff",
        weight: isWalk ? 6.5 : isDrive ? 8.5 : 9.5,
        opacity: 0.95,
        lineCap: "round",
        lineJoin: "round",
        className: "journey-casing-line",
        interactive: false,
      }).addTo(routeGroup);

      // 4. Remaining Core (vibrant transit line ahead)
      const remainingCore = L.polyline([], {
        color: isWalk ? "#0284c7" : color,
        weight: isWalk ? 4 : isDrive ? 5.5 : 6,
        opacity: 1,
        dashArray: isWalk ? "3 8" : undefined,
        lineCap: "round",
        lineJoin: "round",
        className: isWalk ? "transit-walk-flow-animated" : undefined,
        interactive: false,
      }).addTo(routeGroup);

      // 5. Remaining Animated Flow Pulse (active energy beam traveling forward)
      let remainingFlow: L.Polyline | undefined;
      if (!isWalk && !isDrive) {
        remainingFlow = L.polyline([], {
          color: "#ffffff",
          weight: 2.5,
          opacity: 0.85,
          dashArray: "10 22",
          lineCap: "round",
          lineJoin: "round",
          className: "transit-flow-animated",
          interactive: false,
        }).addTo(routeGroup);
      }

      dynamicLegs.push({
        legIndex,
        vertices,
        startDist: legStartDist,
        endDist: runDist,
        startTimeMin: legStartTimeMin,
        endTimeMin: runTimeMin,
        traversedCasing,
        traversedCore,
        remainingCasing,
        remainingCore,
        remainingFlow,
      });
    });

    dynamicLegsRef.current = dynamicLegs;

    const updateDynamicRoutePolylines = (curDist: number, curPoint?: [number, number]) => {
      const legs = dynamicLegsRef.current;
      if (!legs || legs.length === 0) return;

      for (let i = 0; i < legs.length; i++) {
        const leg = legs[i]!;
        const { vertices, startDist, endDist } = leg;

        if (curDist <= startDist) {
          // Ahead of vehicle: 0% traversed, 100% remaining
          const allPts = vertices.map((v) => [v.lat, v.lon] as [number, number]);
          leg.traversedCasing.setLatLngs([]);
          leg.traversedCore.setLatLngs([]);
          leg.remainingCasing.setLatLngs(allPts);
          leg.remainingCore.setLatLngs(allPts);
          leg.remainingFlow?.setLatLngs(allPts);
        } else if (curDist >= endDist) {
          // Behind vehicle: 100% traversed (gray blurred), 0% remaining
          const allPts = vertices.map((v) => [v.lat, v.lon] as [number, number]);
          leg.traversedCasing.setLatLngs(allPts);
          leg.traversedCore.setLatLngs(allPts);
          leg.remainingCasing.setLatLngs([]);
          leg.remainingCore.setLatLngs([]);
          leg.remainingFlow?.setLatLngs([]);
        } else {
          // Vehicle is currently traversing this leg!
          let splitIdx = 0;
          for (let j = 0; j < vertices.length - 1; j++) {
            if (curDist >= vertices[j]!.cumDist && curDist <= vertices[j + 1]!.cumDist) {
              splitIdx = j;
              break;
            }
          }

          // Traversed portion (start of leg up to current vehicle position)
          const traversedPts: [number, number][] = [];
          for (let j = 0; j <= splitIdx; j++) {
            traversedPts.push([vertices[j]!.lat, vertices[j]!.lon]);
          }
          if (curPoint) {
            traversedPts.push(curPoint);
          }

          // Remaining portion (current vehicle position to end of leg)
          const remainingPts: [number, number][] = [];
          if (curPoint) {
            remainingPts.push(curPoint);
          }
          for (let j = splitIdx + 1; j < vertices.length; j++) {
            remainingPts.push([vertices[j]!.lat, vertices[j]!.lon]);
          }

          leg.traversedCasing.setLatLngs(traversedPts);
          leg.traversedCore.setLatLngs(traversedPts);
          leg.remainingCasing.setLatLngs(remainingPts);
          leg.remainingCore.setLatLngs(remainingPts);
          leg.remainingFlow?.setLatLngs(remainingPts);
        }
      }
    };

    updatePolylinesRef.current = updateDynamicRoutePolylines;

    // Build transfer/interchange milestones between consecutive legs
    const transfers: TransferNode[] = [];
    for (let i = 0; i < journey.legs.length - 1; i++) {
      const curLeg = journey.legs[i]!;
      const nextLeg = journey.legs[i + 1]!;
      const curLegSegments = segments.filter((s) => s.legIndex === i);
      if (curLegSegments.length > 0) {
        const lastSeg = curLegSegments[curLegSegments.length - 1]!;
        transfers.push({
          distM: lastSeg.endCumDist,
          lat: lastSeg.to.lat,
          lon: lastSeg.to.lon,
          stationName: nextLeg.from || curLeg.to || "Transit Interchange",
          fromLegIndex: i,
          toLegIndex: i + 1,
          deboardMode: curLeg.mode,
          deboardText: formatLegModeLabel(curLeg),
          boardMode: nextLeg.mode,
          boardText: formatLegModeLabel(nextLeg),
          nextDestination: nextLeg.to,
          triggered: false,
        });
      }
    }
    transfersRef.current = transfers;
    dwellUntilTimeRef.current = 0;
    activeTransferRef.current = null;

    const totalCo2SavedG = Math.max(
      0,
      Math.round((journey.totalDistanceM / 1000) * 170 - journey.co2g),
    );
    const totalCo2SavedKg = Number((totalCo2SavedG / 1000).toFixed(2));

    // Position camera at start with Google Maps 48° tilt and forward heading
    if (segments.length > 0) {
      const first = segments[0]!;
      const initialRotation = -first.bearing;
      currentRotationRef.current = initialRotation;

      const stage = document.getElementById("flythrough-3d-stage");
      if (stage) {
        stage.style.transition = "transform 0.8s cubic-bezier(0.2, 0.8, 0.25, 1)";
        stage.style.transform = `scale(1.22) rotateX(40deg) rotateZ(${initialRotation.toFixed(2)}deg)`;
        stage.style.setProperty("--beacon-pointer-rot", `${first.bearing.toFixed(1)}deg`);
        stage.style.setProperty("--beacon-icon-rot", `${(-initialRotation).toFixed(1)}deg`);
      }

      map.flyTo([first.from.lat, first.from.lon], first.zoom, { duration: 0.8 });

      // Create beacon marker
      if (!markerRef.current) {
        markerRef.current = L.marker([first.from.lat, first.from.lon], {
          icon: createFlyThroughBeaconIcon(first.mode, first.leg.line || ""),
          zIndexOffset: 2000,
        }).addTo(map);
      } else {
        markerRef.current.setLatLng([first.from.lat, first.from.lon]);
        markerRef.current.setIcon(createFlyThroughBeaconIcon(first.mode, first.leg.line || ""));
      }

      const markerEl = markerRef.current?.getElement();
      if (markerEl) {
        markerEl.style.setProperty("--beacon-pointer-rot", `${first.bearing.toFixed(1)}deg`);
        markerEl.style.setProperty("--beacon-icon-rot", `${(-initialRotation).toFixed(1)}deg`);
      }

      // Initialize dynamic route polylines at starting point
      updateDynamicRoutePolylines(0, [first.from.lat, first.from.lon]);

      const totalJourneyTimeMin = Math.round(journey.totalTimeMin);
      const initialTbt = getTbtStepInfo(0);
      lastEmittedTbtIdxRef.current = initialTbt.activeIndex;

      onUpdateState({
        progress: 0,
        elapsedTimeMin: 0,
        totalTimeMin: totalJourneyTimeMin,
        isFinished: false,
        isPlaying: false,
        currentLegIndex: 0,
        totalLegs: journey.legs.length,
        mode: first.mode,
        lineName:
          first.leg.line ||
          (first.mode === "metro"
            ? "Maha Metro"
            : first.mode === "bus"
              ? "Aapli Bus"
              : "Pedestrian"),
        headline:
          first.mode === "walk"
            ? `Walking from ${first.leg.from}`
            : `Boarding ${first.leg.line || "transit"} at ${first.leg.from}`,
        subline: `${first.leg.from} ➔ ${first.leg.to} (${(first.distM / 1000).toFixed(1)} km) • ${totalJourneyTimeMin} min total`,
        co2SavedKg: totalCo2SavedKg,
        fromName: first.leg.from,
        toName: journey.legs[journey.legs.length - 1]?.to || "Destination",
        transferInfo: null,
        activeTbtStepIndex: initialTbt.activeIndex,
        distanceToNextTbtStepM: initialTbt.distToNextM,
      });
    }

    return () => {
      const stage = document.getElementById("flythrough-3d-stage");
      if (stage) {
        stage.style.transition = "transform 0.6s cubic-bezier(0.25, 1, 0.5, 1)";
        stage.style.transform = "scale(1) rotateX(0deg) rotateZ(0deg)";
        stage.style.removeProperty("--beacon-pointer-rot");
        stage.style.removeProperty("--beacon-icon-rot");
      }
      if (markerRef.current) {
        markerRef.current.remove();
        markerRef.current = null;
      }
      if (routeLayersGroupRef.current) {
        routeLayersGroupRef.current.remove();
        routeLayersGroupRef.current = null;
      }
      dynamicLegsRef.current = [];
      updatePolylinesRef.current = null;
      if (animFrameRef.current) {
        cancelAnimationFrame(animFrameRef.current);
        animFrameRef.current = null;
      }
    };
  }, [journey, map, restartCounter, onUpdateState, getTbtStepInfo]);

  // 2. 60 FPS Camera & Beacon Animation Loop
  useEffect(() => {
    if (!isPlaying) {
      if (animFrameRef.current) {
        cancelAnimationFrame(animFrameRef.current);
        animFrameRef.current = null;
      }
      lastTimeRef.current = null;
      return;
    }

    const segments = segmentsRef.current;
    const totalDist = totalDistRef.current;
    if (segments.length === 0 || totalDist <= 0) return;

    // Base cruise speed: complete route in ~24s at 1x speed (or ~12s at 2x, ~6s at 4x)
    const baseDurationSec = Math.max(16, Math.min(32, totalDist / 250));
    const nominalMetersPerSec = (totalDist / baseDurationSec) * speed;
    const totalJourneyTimeMin = Math.round(journey.totalTimeMin);

    const tick = (now: number) => {
      if (!lastTimeRef.current) {
        lastTimeRef.current = now;
      }
      const deltaSec = Math.min(0.1, (now - lastTimeRef.current) / 1000);
      lastTimeRef.current = now;

      // ── Dwell Pause Check at Interchange / Transfer Node ──
      if (dwellUntilTimeRef.current > 0) {
        if (now < dwellUntilTimeRef.current) {
          // Keep waiting at the station node so user clearly absorbs deboard/board directions
          animFrameRef.current = requestAnimationFrame(tick);
          return;
        } else {
          // Dwell finished! Clear transfer state and resume movement onto the next leg
          dwellUntilTimeRef.current = 0;
          activeTransferRef.current = null;
          onUpdateState({ transferInfo: null });
        }
      }

      // Find active segment at current position to apply mode-specific speed (e.g. walk vs transit)
      const curDistBeforeStep = currentDistRef.current;
      const activeSeg =
        segments.find(
          (s) => curDistBeforeStep >= s.startCumDist && curDistBeforeStep <= s.endCumDist,
        ) || segments[segments.length - 1]!;

      const modeMultiplier = MODE_SPEED_MULTIPLIERS[activeSeg.mode] ?? 1.0;
      currentDistRef.current += nominalMetersPerSec * modeMultiplier * deltaSec;

      if (currentDistRef.current >= totalDist) {
        currentDistRef.current = totalDist;
        const lastSeg = segments[segments.length - 1]!;
        if (markerRef.current) {
          markerRef.current.setLatLng([lastSeg.to.lat, lastSeg.to.lon]);
        }
        map.setView([lastSeg.to.lat, lastSeg.to.lon], 16.5, { animate: false });
        updatePolylinesRef.current?.(totalDist, [lastSeg.to.lat, lastSeg.to.lon]);

        const stage = document.getElementById("flythrough-3d-stage");
        if (stage) {
          stage.style.transform = `scale(1.22) rotateX(40deg) rotateZ(${currentRotationRef.current.toFixed(2)}deg)`;
          stage.style.setProperty(
            "--beacon-icon-rot",
            `${(-currentRotationRef.current).toFixed(1)}deg`,
          );
        }

        const totalCo2SavedG = Math.max(
          0,
          Math.round((journey.totalDistanceM / 1000) * 170 - journey.co2g),
        );
        const totalCo2SavedKg = Number((totalCo2SavedG / 1000).toFixed(2));
        const finalTbtIdx = Math.max(0, tbtStepsRef.current.length - 1);

        onUpdateState({
          progress: 1,
          elapsedTimeMin: totalJourneyTimeMin,
          totalTimeMin: totalJourneyTimeMin,
          isFinished: true,
          isPlaying: false,
          headline: `Arrived at ${lastSeg.leg.to}!`,
          subline: `🎉 Completed in full (${totalJourneyTimeMin} min) • Saved ${totalCo2SavedKg.toFixed(2)} kg CO₂ vs car`,
          co2SavedKg: totalCo2SavedKg,
          transferInfo: null,
          activeTbtStepIndex: finalTbtIdx,
          distanceToNextTbtStepM: 0,
        });

        onFinished();
        return;
      }

      // Check if arriving at an untriggered transfer node
      const curDist = currentDistRef.current;
      const pendingTransfer = transfersRef.current.find(
        (t) => !t.triggered && curDist >= t.distM - 12,
      );

      if (pendingTransfer) {
        pendingTransfer.triggered = true;
        currentDistRef.current = pendingTransfer.distM; // Snap directly to interchange station
        activeTransferRef.current = pendingTransfer;
        dwellUntilTimeRef.current = now + 850 / speed; // Snappy ~0.85s pause to register transfer

        // Position beacon marker exactly at station and update icon to new mode
        if (markerRef.current) {
          markerRef.current.setLatLng([pendingTransfer.lat, pendingTransfer.lon]);
          markerRef.current.setIcon(
            createFlyThroughBeaconIcon(pendingTransfer.boardMode, pendingTransfer.boardText),
          );
        }
        lastActiveModeRef.current = `${pendingTransfer.boardMode}_${pendingTransfer.boardText}`;

        map.setView([pendingTransfer.lat, pendingTransfer.lon], 16.75, { animate: true });
        updatePolylinesRef.current?.(pendingTransfer.distM, [
          pendingTransfer.lat,
          pendingTransfer.lon,
        ]);

        const currentElapsedMin = calcElapsedTimeMin(pendingTransfer.distM);
        const remainingTimeMin = Math.max(0, totalJourneyTimeMin - currentElapsedMin);
        const transferTbt = getTbtStepInfo(pendingTransfer.distM);

        // Notify HUD with clear Deboard & Board instructions
        onUpdateState({
          elapsedTimeMin: currentElapsedMin,
          totalTimeMin: totalJourneyTimeMin,
          mode: pendingTransfer.boardMode,
          lineName: pendingTransfer.boardText,
          currentLegIndex: pendingTransfer.toLegIndex,
          headline: `Deboard ${pendingTransfer.deboardText} ➔ Board ${pendingTransfer.boardText}`,
          subline: `Transfer at ${pendingTransfer.stationName} • ~${remainingTimeMin} min left to ${pendingTransfer.nextDestination}`,
          transferInfo: {
            isTransferring: true,
            stationName: pendingTransfer.stationName,
            deboardMode: pendingTransfer.deboardMode,
            deboardText: pendingTransfer.deboardText,
            boardMode: pendingTransfer.boardMode,
            boardText: pendingTransfer.boardText,
            nextDestination: pendingTransfer.nextDestination,
          },
          activeTbtStepIndex: transferTbt.activeIndex,
          distanceToNextTbtStepM: transferTbt.distToNextM,
        });

        animFrameRef.current = requestAnimationFrame(tick);
        return;
      }

      // Find active segment for current distance
      const seg =
        segments.find((s) => curDist >= s.startCumDist && curDist <= s.endCumDist) ||
        segments[segments.length - 1]!;

      const segProgress = (curDist - seg.startCumDist) / seg.distM;
      const clampedProg = Math.max(0, Math.min(1, segProgress));

      const lat = seg.from.lat + (seg.to.lat - seg.from.lat) * clampedProg;
      const lon = seg.from.lon + (seg.to.lon - seg.from.lon) * clampedProg;

      // Update beacon marker position and dynamically switch icon when entering a new leg/mode
      if (markerRef.current) {
        markerRef.current.setLatLng([lat, lon]);

        const currentModeKey = `${seg.mode}_${seg.leg.line || ""}`;
        if (currentModeKey !== lastActiveModeRef.current) {
          lastActiveModeRef.current = currentModeKey;
          markerRef.current.setIcon(createFlyThroughBeaconIcon(seg.mode, seg.leg.line || ""));
        }
      }

      // Smoothly update camera view without animation stuttering
      map.setView([lat, lon], seg.zoom, { animate: false });
      // Rebuilding all path arrays every display frame is unnecessary.
      if (performance.now() - lastRoutePaint.current >= 100) {
        lastRoutePaint.current = performance.now();
        updatePolylinesRef.current?.(curDist, [lat, lon]);
      }

      // Smooth 3D course-up camera rotation (heading in the direction of the route)
      const targetAngle = -seg.bearing;
      const unwrappedTarget = unwrapAngle(currentRotationRef.current, targetAngle);
      // Smooth interpolation factor (dampens sharp corner jerks into a smooth vehicular turn)
      const lerpFactor = Math.min(1, deltaSec * 6.5);
      currentRotationRef.current += (unwrappedTarget - currentRotationRef.current) * lerpFactor;

      const stage = document.getElementById("flythrough-3d-stage");
      if (stage) {
        stage.style.transition = "none";
        stage.style.transform = `scale(1.22) rotateX(40deg) rotateZ(${currentRotationRef.current.toFixed(2)}deg)`;
        stage.style.setProperty("--beacon-pointer-rot", `${seg.bearing.toFixed(1)}deg`);
        stage.style.setProperty(
          "--beacon-icon-rot",
          `${(-currentRotationRef.current).toFixed(1)}deg`,
        );
      }

      const markerEl = markerRef.current?.getElement();
      if (markerEl) {
        markerEl.style.setProperty("--beacon-pointer-rot", `${seg.bearing.toFixed(1)}deg`);
        markerEl.style.setProperty(
          "--beacon-icon-rot",
          `${(-currentRotationRef.current).toFixed(1)}deg`,
        );
      }

      // Check upcoming TBT step and compute live countdown distance
      const runningTbt = getTbtStepInfo(curDist);
      const isTbtStepChanged = runningTbt.activeIndex !== lastEmittedTbtIdxRef.current;
      const nowSec = now / 1000;

      // Update state if TBT step changes immediately, or if leg changes, or at ~5.5 Hz for smooth distance countdown
      if (
        isTbtStepChanged ||
        seg.legIndex !== lastEmittedLegRef.current ||
        nowSec - lastEmittedSecRef.current > 0.18
      ) {
        lastEmittedLegRef.current = seg.legIndex;
        lastEmittedTbtIdxRef.current = runningTbt.activeIndex;
        lastEmittedSecRef.current = nowSec;

        const progressFraction = curDist / totalDist;
        const currentElapsedMin = calcElapsedTimeMin(curDist);
        const remainingKm = Math.max(0, (totalDist - curDist) / 1000);
        const remainingTimeMin = Math.max(0, totalJourneyTimeMin - currentElapsedMin);
        const leg = seg.leg;

        // Check if camera is currently approaching an upcoming transfer (within 160m)
        const approachingTransfer = transfersRef.current.find(
          (t) => !t.triggered && curDist >= t.distM - 160 && curDist < t.distM - 12,
        );

        let headline = "";
        let subline = `${remainingKm.toFixed(1)} km remaining (${remainingTimeMin} min left) to ${journey.legs[journey.legs.length - 1]?.to || "Destination"}`;

        if (approachingTransfer) {
          headline = `Approaching ${approachingTransfer.stationName}`;
          subline = `Deboard ${approachingTransfer.deboardText} ➔ Board ${approachingTransfer.boardText} (~${remainingTimeMin} min left)`;
        } else if (seg.mode === "walk") {
          headline = `Walking towards ${leg.to}`;
        } else if (seg.mode === "metro") {
          headline = `Cruising Maha Metro (${leg.line || "Line"}) to ${leg.to}`;
        } else if (seg.mode === "bus") {
          headline = `Aapli Bus ${leg.line || leg.busNumber || ""} en route to ${leg.to}`;
        } else {
          headline = `Driving en route to ${leg.to}`;
        }

        const totalCo2SavedG = Math.max(
          0,
          Math.round((journey.totalDistanceM / 1000) * 170 - journey.co2g),
        );
        const totalCo2SavedKg = Number((totalCo2SavedG / 1000).toFixed(2));

        onUpdateState({
          progress: progressFraction,
          elapsedTimeMin: currentElapsedMin,
          totalTimeMin: totalJourneyTimeMin,
          currentLegIndex: seg.legIndex,
          mode: seg.mode,
          lineName:
            leg.line ||
            (seg.mode === "metro" ? "Maha Metro" : seg.mode === "bus" ? "Aapli Bus" : "Pedestrian"),
          headline,
          subline,
          co2SavedKg: totalCo2SavedKg,
          activeTbtStepIndex: runningTbt.activeIndex,
          distanceToNextTbtStepM: runningTbt.distToNextM,
        });
      }

      animFrameRef.current = requestAnimationFrame(tick);
    };

    animFrameRef.current = requestAnimationFrame(tick);

    return () => {
      if (animFrameRef.current) {
        cancelAnimationFrame(animFrameRef.current);
        animFrameRef.current = null;
      }
    };
  }, [
    isPlaying,
    speed,
    journey,
    map,
    onFinished,
    onUpdateState,
    calcElapsedTimeMin,
    getTbtStepInfo,
  ]);

  // 3. User Step Click / Seek to Progress
  useEffect(() => {
    if (seekProgress === undefined || seekProgress === null) return;
    const segments = segmentsRef.current;
    const totalDist = totalDistRef.current;
    if (segments.length === 0 || totalDist <= 0) return;

    const targetDist = Math.max(0, Math.min(totalDist, seekProgress * totalDist));
    currentDistRef.current = targetDist;

    const seg =
      segments.find((s) => targetDist >= s.startCumDist && targetDist <= s.endCumDist) ||
      segments[segments.length - 1]!;

    const segSpan = seg.distM || 1;
    const segProgress = (targetDist - seg.startCumDist) / segSpan;
    const clampedProg = Math.max(0, Math.min(1, segProgress));

    const lat = seg.from.lat + (seg.to.lat - seg.from.lat) * clampedProg;
    const lon = seg.from.lon + (seg.to.lon - seg.from.lon) * clampedProg;

    if (markerRef.current) {
      markerRef.current.setLatLng([lat, lon]);
      markerRef.current.setIcon(createFlyThroughBeaconIcon(seg.mode, seg.leg.line || ""));
    }

    map.setView([lat, lon], seg.zoom, { animate: false });
    updatePolylinesRef.current?.(targetDist, [lat, lon]);

    currentRotationRef.current = -seg.bearing;
    const stage = document.getElementById("flythrough-3d-stage");
    if (stage) {
      stage.style.transition = "transform 0.4s ease-out";
      stage.style.transform = `scale(1.22) rotateX(40deg) rotateZ(${currentRotationRef.current.toFixed(2)}deg)`;
      stage.style.setProperty("--beacon-pointer-rot", `${seg.bearing.toFixed(1)}deg`);
      stage.style.setProperty(
        "--beacon-icon-rot",
        `${(-currentRotationRef.current).toFixed(1)}deg`,
      );
    }

    const currentElapsedMin = calcElapsedTimeMin(targetDist);
    const progressFraction = targetDist / totalDist;
    const totalJourneyTimeMin = Math.round(journey.totalTimeMin);
    const remainingTimeMin = Math.max(0, totalJourneyTimeMin - currentElapsedMin);
    const seekTbt = getTbtStepInfo(targetDist);
    lastEmittedTbtIdxRef.current = seekTbt.activeIndex;

    onUpdateState({
      progress: progressFraction,
      elapsedTimeMin: currentElapsedMin,
      totalTimeMin: totalJourneyTimeMin,
      currentLegIndex: seg.legIndex,
      mode: seg.mode,
      lineName:
        seg.leg.line ||
        (seg.mode === "metro" ? "Maha Metro" : seg.mode === "bus" ? "Aapli Bus" : "Pedestrian"),
      headline:
        seg.mode === "walk" ? `Walking towards ${seg.leg.to}` : `Traveling towards ${seg.leg.to}`,
      subline: `${seg.leg.from} ➔ ${seg.leg.to} (~${remainingTimeMin} min left to ${journey.legs[journey.legs.length - 1]?.to || "Destination"})`,
      activeTbtStepIndex: seekTbt.activeIndex,
      distanceToNextTbtStepM: seekTbt.distToNextM,
    });
  }, [seekProgress, map, journey, onUpdateState, calcElapsedTimeMin, getTbtStepInfo]);

  return null;
}
