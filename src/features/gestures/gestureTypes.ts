/**
 * @file gestureTypes.ts
 * Type definitions, landmark representations, gesture states, configuration,
 * and public interfaces for Touchless Map Control.
 */

/**
 * Normalized 3D landmark point returned by hand tracking models.
 * Coordinates x and y are normalized to [0.0, 1.0] relative to image width and height.
 * Coordinate z represents depth relative to the wrist.
 */
export interface NormalizedLandmark {
  x: number;
  y: number;
  z?: number;
  visibility?: number;
}

/**
 * Standard MediaPipe Hand Landmark Indices (21 landmarks per hand).
 */
export const HAND_LANDMARK = {
  WRIST: 0,
  THUMB_CMC: 1,
  THUMB_MCP: 2,
  THUMB_IP: 3,
  THUMB_TIP: 4,
  INDEX_FINGER_MCP: 5,
  INDEX_FINGER_PIP: 6,
  INDEX_FINGER_DIP: 7,
  INDEX_FINGER_TIP: 8,
  MIDDLE_FINGER_MCP: 9,
  MIDDLE_FINGER_PIP: 10,
  MIDDLE_FINGER_DIP: 11,
  MIDDLE_FINGER_TIP: 12,
  RING_FINGER_MCP: 13,
  RING_FINGER_PIP: 14,
  RING_FINGER_DIP: 15,
  RING_FINGER_TIP: 16,
  PINKY_MCP: 17,
  PINKY_PIP: 18,
  PINKY_DIP: 19,
  PINKY_TIP: 20,
} as const;

export type HandLandmarkIndex = (typeof HAND_LANDMARK)[keyof typeof HAND_LANDMARK];

/**
 * High-level lifecycle states of the touchless tracking system.
 */
export type TrackingStatus =
  | "idle"
  | "unsupported"
  | "requesting_permission"
  | "permission_denied"
  | "model_loading"
  | "no_hand"
  | "hand_detected"
  | "calibrating"
  | "tracking_active"
  | "interrupted"
  | "error";

/**
 * Qualitative pinch classification relative to the calibrated baseline.
 */
export type PinchState = "none" | "pinching" | "spreading" | "neutral";

/**
 * Discrete zoom action direction.
 */
export type ZoomDirection = "in" | "out" | "none";

/**
 * Runtime configuration parameters for gesture recognition and zoom mapping.
 */
export interface GestureConfig {
  /** Minimum finger separation in normalized units to consider a pinch valid */
  minDistance: number;
  /** Maximum finger separation in normalized units to prevent unnatural spreading */
  maxDistance: number;
  /** Deadband threshold around baseline distance where no zoom action occurs */
  neutralThreshold: number;
  /** Exponential moving average factor (0.0 to 1.0) for temporal landmark smoothing */
  smoothingFactor: number;
  /** Sensitivity multiplier for converting normalized distance delta to Leaflet zoom level */
  zoomSensitivity: number;
  /** Minimum zoom delta to emit in a single update to avoid microscopic jitter */
  minZoomDelta: number;
  /** Maximum allowed zoom delta per emitted update */
  maxZoomDelta: number;
  /** Minimum time in milliseconds between discrete zoom commands (prevents runaway zoom) */
  zoomCooldownMs: number;
  /** Number of stable consecutive frames required to calibrate the user's neutral baseline */
  calibrationFrames: number;
  /** Maximum allowed variance during calibration before resetting calibration */
  calibrationMaxVariance: number;
  /** Consecutive frames without hand detection before transitioning to 'no_hand' */
  lostTrackingGraceFrames: number;
  /** Minimum detection confidence score for hand model */
  minDetectionConfidence: number;
  /** Minimum tracking confidence score for hand model */
  minTrackingConfidence: number;
  /** Video capture width in pixels (mobile-optimized default) */
  targetVideoWidth: number;
  /** Video capture height in pixels (mobile-optimized default) */
  targetVideoHeight: number;
  /** Throttle interval in milliseconds between inference runs (default ~33ms = 30fps) */
  inferenceThrottleMs: number;
}

/**
 * Detailed information computed for each video frame.
 */
export interface GestureFrameData {
  thumbTip: NormalizedLandmark;
  indexTip: NormalizedLandmark;
  rawDistance: number;
  smoothedDistance: number;
  baselineDistance: number | null;
  deltaFromBaseline: number;
  pinchState: PinchState;
  zoomDelta: number;
  confidence: number;
  timestamp: number;
}

/**
 * Observable state exposed by the touchless gesture controller.
 */
export interface TouchlessState {
  isActive: boolean;
  isSupported: boolean;
  status: TrackingStatus;
  pinchState: PinchState;
  currentDistance: number;
  baselineDistance: number | null;
  zoomDelta: number;
  errorMessage: string | null;
}

/**
 * Event callbacks accepted by the gesture controller.
 */
export interface GestureCallbacks {
  /** Emitted when a smoothed, bounded zoom delta should be applied to the map */
  onZoomDelta?: ((delta: number) => void) | undefined;
  /** Emitted when tracking lifecycle state changes */
  onStatusChange?: ((status: TrackingStatus) => void) | undefined;
  /** Emitted with detailed per-frame metrics */
  onFrame?: ((data: GestureFrameData) => void) | undefined;
  /** Emitted when an unrecoverable camera or model error occurs */
  onError?: ((error: Error) => void) | undefined;
}

/**
 * Public controller interface returned by useHandGesture hook or controller class.
 */
export interface TouchlessController {
  /** Current reactive state of the gesture system */
  readonly state: TouchlessState;
  /** Explicitly activate camera and gesture detection */
  start: () => Promise<void>;
  /** Stop camera, cancel frame loop, and release all media resources */
  stop: () => void;
  /** Recalibrate the neutral pinch baseline */
  recalibrate: () => void;
  /** Clean up and dispose of model assets */
  dispose: () => void;
}
