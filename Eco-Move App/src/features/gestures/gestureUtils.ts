/**
 * @file gestureUtils.ts
 * Distance calculations, temporal exponential smoothing, hysteresis deadbands,
 * baseline calibration, and gesture classification for Touchless Map Control.
 */

import type { GestureConfig, NormalizedLandmark, PinchState } from "./gestureTypes";
import { DEFAULT_GESTURE_CONFIG } from "./gestureSettings";

/**
 * Calculates Euclidean distance between two landmarks in normalized 2D image space.
 */
export function calculateEuclideanDistance(p1: NormalizedLandmark, p2: NormalizedLandmark): number {
  const dx = p2.x - p1.x;
  const dy = p2.y - p1.y;
  return Math.hypot(dx, dy);
}

/**
 * Calculates 3D Euclidean distance when depth (z) coordinate is available.
 */
export function calculateEuclideanDistance3D(
  p1: NormalizedLandmark,
  p2: NormalizedLandmark,
): number {
  const dx = p2.x - p1.x;
  const dy = p2.y - p1.y;
  const dz = (p2.z ?? 0) - (p1.z ?? 0);
  return Math.hypot(dx, dy, dz);
}

/**
 * Applies exponential moving average (EMA) to smooth frame-to-frame jitter.
 * @param current Latest raw value from the model.
 * @param previous Previous smoothed value.
 * @param factor Smoothing factor alpha in range [0, 1]. Higher = faster response, lower = smoother.
 */
export function applyExponentialSmoothing(
  current: number,
  previous: number,
  factor: number,
): number {
  const alpha = Math.min(Math.max(factor, 0.01), 1.0);
  return alpha * current + (1 - alpha) * previous;
}

/**
 * Clamps a number to a bounded range.
 */
export function clamp(value: number, min: number, max: number): number {
  if (value < min) return min;
  if (value > max) return max;
  return value;
}

/**
 * Computes arithmetic mean and sample variance for an array of numbers.
 */
export function calculateMeanAndVariance(values: readonly number[]): {
  mean: number;
  variance: number;
} {
  const count = values.length;
  if (count === 0) return { mean: 0, variance: 0 };
  if (count === 1) return { mean: values[0] ?? 0, variance: 0 };

  const sum = values.reduce((acc, v) => acc + v, 0);
  const mean = sum / count;
  const squareDiffSum = values.reduce((acc, v) => acc + Math.pow(v - mean, 2), 0);
  const variance = squareDiffSum / count;

  return { mean, variance };
}

/**
 * Classifies the qualitative pinch state based on distance relative to baseline
 * with a deadband hysteresis threshold.
 */
export function classifyPinchState(
  distance: number,
  baseline: number | null,
  config: GestureConfig = DEFAULT_GESTURE_CONFIG,
): PinchState {
  if (baseline === null || baseline <= 0) {
    return "none";
  }

  const diff = distance - baseline;
  if (Math.abs(diff) <= config.neutralThreshold) {
    return "neutral";
  }

  return diff > 0 ? "spreading" : "pinching";
}

/**
 * Maps finger separation distance to a bounded, non-linear Leaflet zoom delta.
 * Positive delta zooms in (fingers spread apart), negative delta zooms out (fingers pinched).
 * Incorporates a deadband around the baseline and clamps to [minZoomDelta, maxZoomDelta].
 * Returns 0 if within the deadband or below minimum perceptible threshold.
 */
export function computeZoomDelta(
  distance: number,
  baseline: number | null,
  config: GestureConfig = DEFAULT_GESTURE_CONFIG,
): number {
  if (baseline === null || baseline <= 0) {
    return 0;
  }

  // Constrain distance within valid physiological bounds
  const boundedDistance = clamp(distance, config.minDistance, config.maxDistance);
  const diff = boundedDistance - baseline;

  // Hysteresis deadband: stationary or micro-tremors in fingers emit no zoom
  if (Math.abs(diff) <= config.neutralThreshold) {
    return 0;
  }

  // Calculate displacement beyond deadband threshold
  const sign = Math.sign(diff);
  const excess = Math.abs(diff) - config.neutralThreshold;

  // Normalized scaling with non-linear curve for intuitive control
  // Slight movements yield fine adjustments; larger movements yield progressive zoom
  const scaled = Math.pow(excess * 5.0, 1.15) * config.zoomSensitivity;

  // Clamp within configured limits
  const clampedDelta = clamp(scaled, config.minZoomDelta, config.maxZoomDelta);

  return sign * clampedDelta;
}

/**
 * Tracks recent distance history to determine whether the user is holding their hand stationary.
 * Prevents repeated / runaway zooming when a user holds a pinched or spread position without moving.
 */
export class GestureMotionTracker {
  private history: number[] = [];
  private lastTriggerTime = 0;
  private lastEmittedDirection: PinchState = "none";
  private lastEmittedDistance = 0;

  constructor(
    private readonly maxHistoryLength = 8,
    private readonly stationaryVelocityThreshold = 0.003,
  ) {}

  /**
   * Adds a new distance sample and returns true if the hand is moving with intent.
   */
  public push(distance: number): void {
    this.history.push(distance);
    if (this.history.length > this.maxHistoryLength) {
      this.history.shift();
    }
  }

  /**
   * Evaluates if the current hand position has changed sufficiently from the last emitted
   * zoom action to warrant another zoom delta (hysteresis + cooldown + rate of change).
   */
  public shouldTriggerZoom(
    currentDistance: number,
    currentState: PinchState,
    now: number,
    cooldownMs: number,
  ): boolean {
    if (currentState === "none" || currentState === "neutral") {
      this.lastEmittedDirection = "none";
      return false;
    }

    // Enforce cooldown interval between discrete zoom actions
    if (now - this.lastTriggerTime < cooldownMs) {
      return false;
    }

    // Check motion variance across recent frames to ensure hand is not completely stationary
    if (this.history.length >= 3) {
      const firstSample = this.history[0] ?? currentDistance;
      const movement = currentDistance - firstSample;
      // Returning toward neutral must not repeat the previous zoom direction.
      if ((currentState === 'spreading' && movement < -this.stationaryVelocityThreshold) ||
          (currentState === 'pinching' && movement > this.stationaryVelocityThreshold)) return false;
      const recentDiff = Math.abs(currentDistance - firstSample);
      if (
        recentDiff < this.stationaryVelocityThreshold &&
        currentState === this.lastEmittedDirection
      ) {
        // Stationary pinched hand — suppress continuous repeat zoom
        return false;
      }
    }

    // Enforce positional delta shift if repeating in the same direction
    if (currentState === this.lastEmittedDirection) {
      const shiftFromLastEmit = Math.abs(currentDistance - this.lastEmittedDistance);
      if (shiftFromLastEmit < 0.012) {
        return false;
      }
    }

    this.lastTriggerTime = now;
    this.lastEmittedDirection = currentState;
    this.lastEmittedDistance = currentDistance;
    return true;
  }

  /**
   * Clears historical motion tracking data.
   */
  public reset(): void {
    this.history = [];
    this.lastTriggerTime = 0;
    this.lastEmittedDirection = "none";
    this.lastEmittedDistance = 0;
  }
}
