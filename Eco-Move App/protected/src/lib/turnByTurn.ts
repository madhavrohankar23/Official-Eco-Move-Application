/**
 * Turn-by-Turn Navigation Engine for Eco-Move Nagpur
 * -------------------------------------------------------------
 * Translates multimodal transit journeys (Walk, Bus, Metro, Drive)
 * into precise, Google Maps-style step-by-step navigation maneuvers.
 * Generates continuous turn-by-turn maneuvers across BOTH walking/driving
 * AND transit legs (Aapli Bus road turns, Maha Metro track curves).
 * 
 * NOTE: Distance and vertex mathematics strictly mirror RouteFlyThroughController
 * so that camera position, beacon coordinates, dynamic traversed polylines,
 * and the Turn-by-Turn navigation panel are 100% in lockstep synchronization.
 */

import type { Journey } from "./routing";
import { NAGPUR_POIS } from "./nagpurPlaces";

export type ManeuverType =
  | "depart"
  | "straight"
  | "turn-slight-left"
  | "turn-left"
  | "turn-sharp-left"
  | "turn-slight-right"
  | "turn-right"
  | "turn-sharp-right"
  | "u-turn"
  | "board-bus"
  | "board-metro"
  | "deboard-transfer"
  | "arrive";

export interface NavigationStep {
  id: string;
  stepIndex: number;
  legIndex: number;
  type: ManeuverType;
  instruction: string;
  subInstruction: string;
  distanceM: number;
  cumDistanceStartM: number;
  cumDistanceEndM: number;
  location: { lat: number; lon: number };
  bearing: number;
  mode: "walk" | "bus" | "metro" | "drive";
  lineName?: string | undefined;
}

// Common Nagpur road corridors and bypasses
const NAGPUR_CORRIDORS: Array<{ name: string; lat: number; lon: number; radiusM: number }> = [
  { name: "Wardha Road (NH 44)", lat: 21.1150, lon: 79.0680, radiusM: 3500 },
  { name: "Hingna Road (NH 353I)", lat: 21.1180, lon: 79.0200, radiusM: 4000 },
  { name: "Amravati Road (NH 53)", lat: 21.1520, lon: 79.0300, radiusM: 3500 },
  { name: "Central Avenue (CA Road)", lat: 21.1490, lon: 79.1100, radiusM: 3000 },
  { name: "Great Nag Road", lat: 21.1350, lon: 79.1000, radiusM: 2500 },
  { name: "Mankapur Ring Road", lat: 21.1850, lon: 79.0750, radiusM: 3000 },
  { name: "Ring Road (Inner Ring)", lat: 21.1200, lon: 79.0600, radiusM: 3500 },
  { name: "Outer Ring Road", lat: 21.1000, lon: 79.0800, radiusM: 5000 },
  { name: "Bhandara Road", lat: 21.1480, lon: 79.1450, radiusM: 3500 },
  { name: "Kamptee Road", lat: 21.1800, lon: 79.1150, radiusM: 4000 },
  { name: "Koradi Road", lat: 21.2100, lon: 79.0900, radiusM: 4000 },
  { name: "North Ambazari Road", lat: 21.1350, lon: 79.0480, radiusM: 2000 },
  { name: "South Ambazari Road", lat: 21.1220, lon: 79.0480, radiusM: 2000 },
  { name: "West High Court (WHC) Road", lat: 21.1418, lon: 79.0601, radiusM: 2000 },
  { name: "Ghat Road", lat: 21.1380, lon: 79.0950, radiusM: 1800 },
  { name: "Manewada Road", lat: 21.1050, lon: 79.0950, radiusM: 2500 },
  { name: "Subhash Road", lat: 21.1460, lon: 79.0920, radiusM: 1500 },
  { name: "Residency Road (Sadar)", lat: 21.1600, lon: 79.0850, radiusM: 2000 },
  { name: "Umred Road", lat: 21.1100, lon: 79.1200, radiusM: 3000 },
  { name: "Katol Road", lat: 21.1700, lon: 79.0550, radiusM: 3000 },
  { name: "Khamla Road", lat: 21.1150, lon: 79.0550, radiusM: 2000 },
];

export function haversineM(lat1: number, lon1: number, lat2: number, lon2: number): number {
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

export function calculateBearing(p1: { lat: number; lon: number }, p2: { lat: number; lon: number }): number {
  const dLon = ((p2.lon - p1.lon) * Math.PI) / 180;
  const lat1 = (p1.lat * Math.PI) / 180;
  const lat2 = (p2.lat * Math.PI) / 180;
  const y = Math.sin(dLon) * Math.cos(lat2);
  const x = Math.cos(lat1) * Math.sin(lat2) * Math.cos(dLon) - Math.sin(lat1) * Math.cos(lat2);
  const brng = (Math.atan2(y, x) * 180) / Math.PI;
  return (brng + 360) % 360;
}

function getCompassHeading(bearing: number): string {
  const normalized = (bearing + 360) % 360;
  if (normalized >= 337.5 || normalized < 22.5) return "north";
  if (normalized >= 22.5 && normalized < 67.5) return "north-east";
  if (normalized >= 67.5 && normalized < 112.5) return "east";
  if (normalized >= 112.5 && normalized < 157.5) return "south-east";
  if (normalized >= 157.5 && normalized < 202.5) return "south";
  if (normalized >= 202.5 && normalized < 247.5) return "south-west";
  if (normalized >= 247.5 && normalized < 292.5) return "west";
  return "north-west";
}

// Coordinate proximity cannot establish an exact road name. Preview uses route endpoints.
function findNearbyCorridor(_lat: number, _lon: number): string | null { return null; }

function findNearbyLandmark(lat: number, lon: number): string | null {
  let closest: { name: string; dist: number } | null = null;
  for (const p of NAGPUR_POIS) {
    const d = haversineM(lat, lon, p.lat, p.lon);
    if (d <= 350 && (!closest || d < closest.dist)) {
      closest = { name: p.name, dist: d };
    }
  }
  return closest ? closest.name : null;
}

export function formatStepDistance(meters: number): string {
  const m = Math.max(0, Math.round(meters));
  if (m < 50) return `${m} m`;
  if (m < 1000) return `${Math.round(m / 10) * 10} m`;
  return `${(m / 1000).toFixed(1)} km`;
}

/**
 * Generates Google Maps-grade turn-by-turn navigation steps for a Journey.
 * Distances are strictly calibrated to the exact path segment coordinates
 * used by RouteFlyThroughController.
 */
export function generateTurnByTurnSteps(journey: Journey): NavigationStep[] {
  if (!journey || !journey.legs || journey.legs.length === 0) return [];

  const rawSteps: NavigationStep[] = [];
  let cumDist = 0;
  let globalStepIndex = 0;

  journey.legs.forEach((leg, legIndex) => {
    const isFirstLeg = legIndex === 0;
    const isLastLeg = legIndex === journey.legs.length - 1;
    const path = leg.path || [];
    const fromName = leg.from || (isFirstLeg ? "Your location" : "Origin");
    const toName = leg.to || (isLastLeg ? "Destination" : "Transit Stop");

    const isWalk = leg.mode === "walk";
    const isDrive = leg.mode === "drive";
    const isBus = leg.mode === "bus";
    const isMetro = leg.mode === "metro";

    const busLabel = leg.busNumber
      ? `Aapli Bus ${leg.busNumber}`
      : leg.line
      ? (leg.line.startsWith("Aapli") ? leg.line : `Aapli Bus (${leg.line})`)
      : "Aapli Bus";

    const metroLabel = leg.line
      ? (leg.line.startsWith("Maha") ? leg.line : `Maha Metro ${leg.line}`)
      : "Maha Metro";

    const transitLabel = isBus ? busLabel : isMetro ? metroLabel : "";

    // If path has fewer than 2 vertices, skip to strictly match RouteFlyThroughController
    if (path.length < 2) return;

    // ─────────────────────────────────────────────────────────────
    // Calculate cumulative distances along this leg's vertices,
    // matching RouteFlyThroughController's exact segment calculation.
    // ─────────────────────────────────────────────────────────────
    const vertexCumDists: number[] = [0];
    let runDist = 0;
    for (let i = 0; i < path.length - 1; i++) {
      const p1 = path[i]!;
      const p2 = path[i + 1]!;
      const d = haversineM(p1.lat, p1.lon, p2.lat, p2.lon);
      if (d <= 0.5) {
        // match controller degenerate skip
        vertexCumDists.push(runDist);
        continue;
      }
      runDist += d;
      vertexCumDists.push(runDist);
    }
    const legDistM = Math.max(10, runDist);

    // Fallback if path is very short (2 points)
    if (path.length < 3) {
      const startLoc = path[0] || { lat: 21.1458, lon: 79.0882 };
      const firstBearing = path.length >= 2 ? calculateBearing(path[0]!, path[1]!) : 0;
      const heading = getCompassHeading(firstBearing);
      const startCorridor = findNearbyCorridor(startLoc.lat, startLoc.lon);

      if (isWalk || isDrive) {
        if (isFirstLeg) {
          rawSteps.push({
            id: `step_${globalStepIndex++}`,
            stepIndex: rawSteps.length,
            legIndex,
            type: "depart",
            instruction: isDrive ? `Depart from ${fromName}` : `Start from ${fromName}`,
            subInstruction: startCorridor
              ? `Head ${heading} onto ${startCorridor}`
              : `Head ${heading} towards ${toName}`,
            distanceM: Math.min(25, legDistM),
            cumDistanceStartM: cumDist,
            cumDistanceEndM: cumDist + Math.min(25, legDistM),
            location: startLoc,
            bearing: firstBearing,
            mode: leg.mode,
          });
        }
        rawSteps.push({
          id: `step_${globalStepIndex++}`,
          stepIndex: rawSteps.length,
          legIndex,
          type: "straight",
          instruction: isLastLeg
            ? `Approach destination at ${toName}`
            : isDrive
            ? `Drive towards ${toName}`
            : `Walk towards ${toName}`,
          subInstruction: startCorridor ? `Continue on ${startCorridor}` : `Proceed straight to ${toName}`,
          distanceM: legDistM,
          cumDistanceStartM: isFirstLeg ? cumDist + Math.min(25, legDistM) : cumDist,
          cumDistanceEndM: cumDist + legDistM,
          location: path[path.length - 1] || startLoc,
          bearing: firstBearing,
          mode: leg.mode,
        });
      } else {
        // Short transit leg
        rawSteps.push({
          id: `step_${globalStepIndex++}`,
          stepIndex: rawSteps.length,
          legIndex,
          type: isBus ? "board-bus" : "board-metro",
          instruction: `Board ${transitLabel} at ${fromName}`,
          subInstruction: `Ride towards ${toName} • ~${Math.round(leg.timeMin || 0)} min`,
          distanceM: Math.round(legDistM * 0.75),
          cumDistanceStartM: cumDist,
          cumDistanceEndM: cumDist + Math.round(legDistM * 0.75),
          location: startLoc,
          bearing: firstBearing,
          mode: leg.mode,
          lineName: transitLabel,
        });
        rawSteps.push({
          id: `step_${globalStepIndex++}`,
          stepIndex: rawSteps.length,
          legIndex,
          type: "deboard-transfer",
          instruction: `Deboard at ${toName}`,
          subInstruction: isLastLeg ? "Alight towards destination" : "Alight for transit transfer",
          distanceM: Math.round(legDistM * 0.25),
          cumDistanceStartM: cumDist + Math.round(legDistM * 0.75),
          cumDistanceEndM: cumDist + legDistM,
          location: path[path.length - 1] || startLoc,
          bearing: firstBearing,
          mode: leg.mode,
          lineName: transitLabel,
        });
      }

      cumDist += legDistM;
      return;
    }

    // ─────────────────────────────────────────────────────────────
    // Continuous Turn-by-Turn detection along full polyline vertices
    // ─────────────────────────────────────────────────────────────
    const startLoc = path[0]!;
    const firstBearing = calculateBearing(path[0]!, path[1]!);
    const heading = getCompassHeading(firstBearing);
    const startCorridor = findNearbyCorridor(startLoc.lat, startLoc.lon);

    // Initial maneuver distance at start of leg
    const initialSpanM = isWalk || isDrive ? Math.min(30, legDistM * 0.15) : Math.min(65, legDistM * 0.15);

    // 1. Initial Step for this leg
    if (isWalk || isDrive) {
      if (isFirstLeg) {
        rawSteps.push({
          id: `step_${globalStepIndex++}`,
          stepIndex: rawSteps.length,
          legIndex,
          type: "depart",
          instruction: isDrive ? `Depart from ${fromName}` : `Start from ${fromName}`,
          subInstruction: startCorridor
            ? `Head ${heading} onto ${startCorridor}`
            : `Head ${heading} towards ${toName}`,
          distanceM: initialSpanM,
          cumDistanceStartM: cumDist,
          cumDistanceEndM: cumDist + initialSpanM,
          location: startLoc,
          bearing: firstBearing,
          mode: leg.mode,
        });
      }
    } else {
      // Boarding Transit Step
      const stopCount = leg.stops && leg.stops.length > 1 ? leg.stops.length - 1 : 1;
      rawSteps.push({
        id: `step_${globalStepIndex++}`,
        stepIndex: rawSteps.length,
        legIndex,
        type: isBus ? "board-bus" : "board-metro",
        instruction: `Board ${transitLabel} at ${fromName}`,
        subInstruction: leg.stops && leg.stops.length > 2
          ? `Ride ${stopCount} stops towards ${toName} • ~${Math.round(leg.timeMin || 0)} min`
          : `Ride towards ${toName} • ~${Math.round(leg.timeMin || 0)} min`,
        distanceM: initialSpanM,
        cumDistanceStartM: cumDist,
        cumDistanceEndM: cumDist + initialSpanM,
        location: startLoc,
        bearing: firstBearing,
        mode: leg.mode,
        lineName: transitLabel,
      });
    }

    let lastManeuverLegDist = isWalk || isDrive ? (isFirstLeg ? initialSpanM : 0) : initialSpanM;

    // Minimum distance spacing between distinct turn maneuvers
    const minTurnSpacing = isWalk ? 35 : isDrive ? 50 : isBus ? 55 : 80;
    const minTurnAngle = isWalk ? 24 : isDrive ? 25 : isBus ? 25 : 20;

    // 2. Detect intermediate turns, road corridors & chowks along path
    for (let i = 1; i < path.length - 1; i++) {
      const prevPt = path[i - 1]!;
      const curPt = path[i]!;
      const nextPt = path[i + 1]!;
      const curVertexDist = vertexCumDists[i]!;

      // Avoid creating turns past the 92% mark of the leg (leave room for clean deboard/destination step)
      if (curVertexDist >= legDistM - 50) break;

      const bearingIn = calculateBearing(prevPt, curPt);
      const bearingOut = calculateBearing(curPt, nextPt);
      const deltaAngle = ((bearingOut - bearingIn + 540) % 360) - 180;
      const absAngle = Math.abs(deltaAngle);

      const distSinceLastManeuver = curVertexDist - lastManeuverLegDist;

      // Turn detected or significant stretch milestone (> 1400m on straight corridor)
      const isTurn = absAngle >= minTurnAngle && distSinceLastManeuver >= minTurnSpacing;
      const isLongStraight = distSinceLastManeuver >= 1400 && absAngle < 15;

      if (isTurn || isLongStraight) {
        let type: ManeuverType = "straight";
        let verb = "Continue";

        if (isTurn) {
          if (absAngle >= 125) {
            type = "u-turn";
            verb = isBus ? "Bus makes U-turn" : isMetro ? "Track U-bend" : "Make a U-turn";
          } else if (deltaAngle > 55) {
            type = "turn-right";
            verb = isBus ? "Turn right" : isMetro ? "Curve right" : "Turn right";
          } else if (deltaAngle > 20) {
            type = "turn-slight-right";
            verb = isBus ? "Turn slight right" : isMetro ? "Slight curve right" : "Turn slight right";
          } else if (deltaAngle < -55) {
            type = "turn-left";
            verb = isBus ? "Turn left" : isMetro ? "Curve left" : "Turn left";
          } else {
            type = "turn-slight-left";
            verb = isBus ? "Turn slight left" : isMetro ? "Slight curve left" : "Turn slight left";
          }
        } else {
          type = "straight";
          verb = isBus ? `Continue along` : isMetro ? `Cruise straight on` : isDrive ? `Continue straight on` : `Walk straight on`;
        }

        const corridor = findNearbyCorridor(curPt.lat, curPt.lon);
        const landmark = findNearbyLandmark(curPt.lat, curPt.lon);

        let instruction = "";
        let subInstruction = "";

        if (isBus) {
          if (isTurn) {
            instruction = corridor
              ? `${verb} onto ${corridor}`
              : `${verb} towards ${toName}`;
            subInstruction = landmark
              ? `Pass by ${landmark} • ${transitLabel}`
              : `${transitLabel} en route to ${toName}`;
          } else {
            instruction = corridor ? `${verb} ${corridor}` : `Continue straight towards ${toName}`;
            subInstruction = `Ride for ${formatStepDistance(distSinceLastManeuver)} on ${transitLabel}`;
          }
        } else if (isMetro) {
          if (isTurn) {
            instruction = corridor
              ? `${verb} along ${corridor}`
              : `${verb} towards ${toName}`;
            subInstruction = landmark
              ? `Near ${landmark} • ${transitLabel}`
              : `${transitLabel} heading to ${toName}`;
          } else {
            instruction = `Cruise along elevated metro corridor`;
            subInstruction = `Next station approaching on ${transitLabel}`;
          }
        } else {
          // Walk or Drive
          if (isTurn) {
            instruction = corridor
              ? `${verb} onto ${corridor}`
              : landmark
              ? `${verb} near ${landmark}`
              : `${verb} towards ${toName}`;
            subInstruction = landmark && !instruction.includes(landmark)
              ? `Pass by ${landmark}`
              : corridor && !instruction.includes(corridor)
              ? `Follow ${corridor}`
              : isDrive
              ? `Drive for ${formatStepDistance(distSinceLastManeuver)}`
              : `Walk for ${formatStepDistance(distSinceLastManeuver)}`;
          } else {
            instruction = corridor ? `Continue on ${corridor}` : `Proceed towards ${toName}`;
            subInstruction = isDrive
              ? `Follow road for ${formatStepDistance(distSinceLastManeuver)}`
              : `Walk for ${formatStepDistance(distSinceLastManeuver)}`;
          }
        }

        const stepDist = distSinceLastManeuver;
        const targetDist = cumDist + curVertexDist;

        rawSteps.push({
          id: `step_${globalStepIndex++}`,
          stepIndex: rawSteps.length,
          legIndex,
          type,
          instruction,
          subInstruction,
          distanceM: stepDist,
          cumDistanceStartM: cumDist + lastManeuverLegDist,
          cumDistanceEndM: targetDist,
          location: curPt,
          bearing: bearingOut,
          mode: leg.mode,
          lineName: transitLabel,
        });

        lastManeuverLegDist = curVertexDist;
      }
    }

    // 3. Final Step of this leg (Deboard or Approach Destination)
    const tailDist = Math.max(10, legDistM - lastManeuverLegDist);
    const lastPt = path[path.length - 1]!;
    const lastBearing = path.length >= 2 ? calculateBearing(path[path.length - 2]!, lastPt) : 0;

    if (isBus || isMetro) {
      rawSteps.push({
        id: `step_${globalStepIndex++}`,
        stepIndex: rawSteps.length,
        legIndex,
        type: "deboard-transfer",
        instruction: `Deboard at ${toName}`,
        subInstruction: isLastLeg
          ? `Alight ${isBus ? "bus" : "metro"} at ${toName} towards destination`
          : `Alight ${isBus ? "bus" : "metro"} at ${toName} for interchange`,
        distanceM: tailDist,
        cumDistanceStartM: cumDist + lastManeuverLegDist,
        cumDistanceEndM: cumDist + legDistM,
        location: lastPt,
        bearing: lastBearing,
        mode: leg.mode,
        lineName: transitLabel,
      });
    } else {
      rawSteps.push({
        id: `step_${globalStepIndex++}`,
        stepIndex: rawSteps.length,
        legIndex,
        type: "straight",
        instruction: isLastLeg
          ? `Approach destination at ${toName}`
          : isDrive
          ? `Drive towards ${toName}`
          : `Walk towards ${toName}`,
        subInstruction: isLastLeg ? "Destination is straight ahead" : `Continue to ${toName}`,
        distanceM: tailDist,
        cumDistanceStartM: cumDist + lastManeuverLegDist,
        cumDistanceEndM: cumDist + legDistM,
        location: lastPt,
        bearing: lastBearing,
        mode: leg.mode,
      });
    }

    cumDist += legDistM;
  });

  // Final Arrival Milestone
  const lastLeg = journey.legs[journey.legs.length - 1]!;
  const lastPath = lastLeg.path || [];
  const destLoc = lastPath[lastPath.length - 1] || { lat: 21.1458, lon: 79.0882 };
  const destName = lastLeg.to || "Destination";
  const co2Kg = ((Math.max(0, (journey.totalDistanceM / 1000) * 170 - journey.co2g)) / 1000).toFixed(2);

  rawSteps.push({
    id: `step_${globalStepIndex++}`,
    stepIndex: rawSteps.length,
    legIndex: journey.legs.length - 1,
    type: "arrive",
    instruction: `Arrive at ${destName}`,
    subInstruction: `Destination reached • Saved ${co2Kg} kg CO₂ vs private car`,
    distanceM: 0,
    cumDistanceStartM: Math.max(0, cumDist - 10),
    cumDistanceEndM: cumDist,
    location: destLoc,
    bearing: 0,
    mode: lastLeg.mode,
  });

  // Re-index steps to ensure 0..N consecutive order
  return rawSteps.map((s, idx) => ({ ...s, stepIndex: idx }));
}
