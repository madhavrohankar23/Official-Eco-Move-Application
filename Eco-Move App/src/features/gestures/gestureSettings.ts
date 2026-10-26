/**
 * @file gestureSettings.ts
 * Default configuration, runtime capability detection, and environment checks
 * for Touchless Map Control.
 */

import type { GestureConfig } from "./gestureTypes";

/**
 * Production-tuned default configuration parameters.
 * Balances responsiveness with resistance to jitter and accidental drift.
 */
export const DEFAULT_GESTURE_CONFIG: Readonly<GestureConfig> = Object.freeze({
  minDistance: 0.02,
  maxDistance: 0.45,
  neutralThreshold: 0.025,
  smoothingFactor: 0.35,
  zoomSensitivity: 1.2,
  minZoomDelta: 0.04,
  maxZoomDelta: 0.6,
  zoomCooldownMs: 320, // Allow the map's normal zoom animation to finish.
  calibrationFrames: 12,
  calibrationMaxVariance: 0.025,
  lostTrackingGraceFrames: 4,
  minDetectionConfidence: 0.65,
  minTrackingConfidence: 0.65,
  targetVideoWidth: 640,
  targetVideoHeight: 480,
  inferenceThrottleMs: 66, // 15 FPS inference; camera/map rendering stays independent
});

/**
 * Static model and wasm asset locations.
 * Uses local, pre-bundled static assets first, with reliable CDN fallbacks.
 */
export const GESTURE_MODEL_ASSETS = Object.freeze({
  localModelPath: "/gesture/models/hand_landmarker.task",
  localWasmPath: "/gesture/wasm",
  cdnModelPath:
    "https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task",
  cdnWasmPath: "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.14/wasm",
});

/**
 * Diagnostic result returned by capability checks.
 */
export interface CapabilityReport {
  isSupported: boolean;
  hasMediaDevices: boolean;
  hasGetUserMedia: boolean;
  isSecureContext: boolean;
  hasWebAssembly: boolean;
  isClient: boolean;
  isMobile: boolean;
  reason?: string | undefined;
}

/**
 * Checks whether the current runtime environment supports browser camera APIs
 * and WebAssembly hand tracking without triggering SSR exceptions.
 */
export function checkTouchlessCapability(): CapabilityReport {
  const isClient = typeof window !== "undefined" && typeof navigator !== "undefined";
  if (!isClient) {
    return {
      isSupported: false,
      hasMediaDevices: false,
      hasGetUserMedia: false,
      isSecureContext: false,
      hasWebAssembly: false,
      isClient: false,
      isMobile: false,
      reason: "Server-side rendering environment (no browser window or navigator).",
    };
  }

  const hasMediaDevices = Boolean(navigator.mediaDevices);
  const hasGetUserMedia = Boolean(
    navigator.mediaDevices && typeof navigator.mediaDevices.getUserMedia === "function",
  );
  const isSecureContext = Boolean(
    window.isSecureContext ||
    window.location?.hostname === "localhost" ||
    window.location?.hostname === "127.0.0.1",
  );
  const hasWebAssembly =
    typeof WebAssembly === "object" && typeof WebAssembly.instantiate === "function";
  const isMobile = isMobileDevice();

  let reason: string | undefined;
  if (!isSecureContext) {
    reason = "Camera API requires a secure context (HTTPS or localhost).";
  } else if (!hasGetUserMedia) {
    reason = "navigator.mediaDevices.getUserMedia is not supported by this browser.";
  } else if (!hasWebAssembly) {
    reason = "WebAssembly is not supported by this browser.";
  }

  const isSupported = hasGetUserMedia && isSecureContext && hasWebAssembly;

  return {
    isSupported,
    hasMediaDevices,
    hasGetUserMedia,
    isSecureContext,
    hasWebAssembly,
    isClient: true,
    isMobile,
    reason,
  };
}

/**
 * Lightweight helper to verify if touchless map control can be used.
 */
export function isTouchlessSupported(): boolean {
  return checkTouchlessCapability().isSupported;
}

/**
 * Feature-detects whether the current client is a mobile device (phone or tablet).
 */
export function isMobileDevice(): boolean {
  if (typeof window === "undefined" || typeof navigator === "undefined") {
    return false;
  }
  const ua = navigator.userAgent || "";
  const mobileRegex =
    /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini|Mobile|mobile/i;
  const hasTouchScreen =
    ("maxTouchPoints" in navigator && navigator.maxTouchPoints > 0) ||
    window.matchMedia?.("(pointer: coarse)").matches;

  return mobileRegex.test(ua) || (hasTouchScreen && window.innerWidth <= 1024);
}

/**
 * Returns a media constraints configuration suitable for the device.
 * Prefers the front-facing camera ('user') with bounded resolution to prevent thermal throttling.
 */
export function getCameraMediaConstraints(
  config: GestureConfig = DEFAULT_GESTURE_CONFIG,
): MediaStreamConstraints {
  return {
    audio: false,
    video: {
      facingMode: "user",
      width: { ideal: config.targetVideoWidth, max: 1280 },
      height: { ideal: config.targetVideoHeight, max: 720 },
      frameRate: { ideal: 30, max: 30 },
    },
  };
}
