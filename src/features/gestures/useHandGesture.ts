/**
 * @file useHandGesture.ts
 * Framework-compatible hook and controller for camera lifecycle,
 * MediaPipe frame processing loop, and touchless gesture events.
 * Written in pure TypeScript (.ts) with no JSX.
 */

import { useEffect, useRef, useState, useCallback } from "react";
import type {
  GestureCallbacks,
  GestureConfig,
  GestureFrameData,
  PinchState,
  TouchlessController,
  TouchlessState,
  TrackingStatus,
} from "./gestureTypes";
import {
  DEFAULT_GESTURE_CONFIG,
  checkTouchlessCapability,
  getCameraMediaConstraints,
} from "./gestureSettings";
import {
  applyExponentialSmoothing,
  calculateEuclideanDistance,
  calculateMeanAndVariance,
  classifyPinchState,
  computeZoomDelta,
  GestureMotionTracker,
} from "./gestureUtils";
import { HandDetector } from "./handDetection";

/**
 * Options for configuring the touchless gesture controller and hook.
 */
export interface UseHandGestureOptions extends GestureCallbacks {
  /** Optional custom gesture configuration */
  config?: Partial<GestureConfig>;
  /** Automatically pause inference when document is hidden (default: true) */
  autoPauseOnHidden?: boolean;
}

/**
 * Return signature of useHandGesture hook.
 */
export interface UseHandGestureReturn extends TouchlessController {
  readonly isActive: boolean;
  readonly isSupported: boolean;
  readonly status: TrackingStatus;
  readonly pinchState: PinchState;
  readonly baselineDistance: number | null;
  readonly currentDistance: number;
  readonly errorMessage: string | null;
}

/**
 * Core Touchless Gesture Controller class.
 * Self-contained, framework-agnostic lifecycle manager for camera stream,
 * MediaPipe hand landmarker, frame rate regulation, and gesture classification.
 */
export class TouchlessGestureController implements TouchlessController {
  private readonly config: GestureConfig;
  private readonly callbacks: GestureCallbacks;
  private readonly detector = new HandDetector();
  private readonly motionTracker = new GestureMotionTracker();

  private videoElement: HTMLVideoElement | null = null;
  private mediaStream: MediaStream | null = null;
  private animationFrameId: number | null = null;
  private lastInferenceTimestamp = 0;

  // Calibration and temporal state
  private calibrationSamples: number[] = [];
  private baselineDistance: number | null = null;
  private smoothedDistance = 0;
  private lostTrackingFrames = 0;
  private isDisposed = false;

  private _state: TouchlessState = {
    isActive: false,
    isSupported: false,
    status: "idle",
    pinchState: "none",
    currentDistance: 0,
    baselineDistance: null,
    zoomDelta: 0,
    errorMessage: null,
  };

  constructor(options: UseHandGestureOptions = {}) {
    this.config = { ...DEFAULT_GESTURE_CONFIG, ...options.config };
    this.callbacks = {
      onZoomDelta: options.onZoomDelta,
      onStatusChange: options.onStatusChange,
      onFrame: options.onFrame,
      onError: options.onError,
    };
    this._state.isSupported = checkTouchlessCapability().isSupported;
  }

  public get state(): TouchlessState {
    return this._state;
  }

  /**
   * Starts camera stream and begins hand tracking after explicit user activation.
   */
  public async start(): Promise<void> {
    if (this._state.isActive || this.isDisposed) {
      return;
    }

    const capability = checkTouchlessCapability();
    if (!capability.isSupported) {
      this.updateState({
        status: "unsupported",
        errorMessage: capability.reason || "Touchless Map Control is not supported on this device.",
      });
      return;
    }

    this.updateState({
      isActive: true,
      status: "requesting_permission",
      errorMessage: null,
      pinchState: "none",
      baselineDistance: null,
    });

    try {
      // 1. Request front camera permission
      const constraints = getCameraMediaConstraints(this.config);
      this.mediaStream = await navigator.mediaDevices.getUserMedia(constraints);

      // Handle external interruption (e.g., incoming phone call, backgrounding)
      const videoTrack = this.mediaStream.getVideoTracks()[0];
      if (videoTrack) {
        videoTrack.onended = () => {
          this.handleInterruption("Camera track ended or interrupted by the system.");
        };
      }

      // 2. Prepare hidden offscreen video element for inference
      this.videoElement = document.createElement("video");
      this.videoElement.setAttribute("playsinline", "true");
      this.videoElement.setAttribute("webkit-playsinline", "true");
      this.videoElement.muted = true;
      this.videoElement.srcObject = this.mediaStream;
      await this.videoElement.play();

      // 3. Initialize MediaPipe HandLandmarker
      this.updateState({ status: "model_loading" });
      await this.detector.initialize(this.config);

      if (this.isDisposed || !this._state.isActive) {
        this.cleanupMediaResources();
        return;
      }

      // 4. Begin frame processing loop
      this.resetCalibration();
      this.updateState({ status: "no_hand" });
      this.bindWindowVisibilityListeners();
      this.scheduleNextFrame();
    } catch (err: unknown) {
      this.cleanupMediaResources();
      const error = err instanceof Error ? err : new Error(String(err));
      const isDenied =
        error.name === "NotAllowedError" ||
        error.name === "PermissionDeniedError" ||
        error.message.includes("denied");

      this.updateState({
        isActive: false,
        status: isDenied ? "permission_denied" : "error",
        errorMessage: isDenied
          ? "Camera permission denied. Please allow camera access in browser settings to use touchless control."
          : `Failed to start camera: ${error.message}`,
      });
      this.callbacks.onError?.(error);
    }
  }

  /**
   * Stops camera stream, releases tracks, and halts inference loop.
   */
  public stop(): void {
    if (!this._state.isActive && this._state.status === "idle") {
      return;
    }
    this.cleanupMediaResources();
    this.updateState({
      isActive: false,
      status: "idle",
      pinchState: "none",
      currentDistance: 0,
      zoomDelta: 0,
    });
  }

  /**
   * Resets the neutral pinch baseline to recalibrate to the user's current hand.
   */
  public recalibrate(): void {
    this.resetCalibration();
    if (this._state.isActive && this.detector.isReady()) {
      this.updateState({
        status: "calibrating",
        baselineDistance: null,
        pinchState: "none",
      });
    }
  }

  /**
   * Completely tears down controller, cancels frames, stops video, and disposes model.
   */
  public dispose(): void {
    this.isDisposed = true;
    this.stop();
    this.detector.dispose();
  }

  // ── Frame Processing Loop ────────────────────────────────────────────────

  private scheduleNextFrame = (): void => {
    if (!this._state.isActive || this.isDisposed) {
      return;
    }
    this.animationFrameId = requestAnimationFrame(this.processFrame);
  };

  private processFrame = (now: DOMHighResTimeStamp): void => {
    if (!this._state.isActive || this.isDisposed || !this.videoElement) {
      return;
    }

    // Throttle inference frequency to prevent device thermal/battery stress
    if (now - this.lastInferenceTimestamp < this.config.inferenceThrottleMs) {
      this.scheduleNextFrame();
      return;
    }
    this.lastInferenceTimestamp = now;

    // Detect hand landmarks
    const detection = this.detector.detect(this.videoElement, now);

    if (!detection) {
      this.lostTrackingFrames++;
      if (this.lostTrackingFrames >= this.config.lostTrackingGraceFrames) {
        if (this._state.status !== "no_hand") {
          this.updateState({
            status: "no_hand",
            pinchState: "none",
            zoomDelta: 0,
          });
        }
      }
      this.scheduleNextFrame();
      return;
    }

    // Hand detected; reset lost tracking counter
    this.lostTrackingFrames = 0;

    // Calculate raw Euclidean distance between thumb tip and index fingertip
    const rawDistance = calculateEuclideanDistance(detection.thumbTip, detection.indexTip);

    // Apply temporal exponential smoothing to eliminate micro-jitter
    if (this.smoothedDistance <= 0) {
      this.smoothedDistance = rawDistance;
    } else {
      this.smoothedDistance = applyExponentialSmoothing(
        rawDistance,
        this.smoothedDistance,
        this.config.smoothingFactor,
      );
    }

    const currentDist = this.smoothedDistance;
    this.motionTracker.push(currentDist);

    // ── Calibration Phase ──
    if (this.baselineDistance === null) {
      this.calibrationSamples.push(currentDist);

      if (this._state.status !== "calibrating") {
        this.updateState({ status: "calibrating" });
      }

      if (this.calibrationSamples.length >= this.config.calibrationFrames) {
        const { mean, variance } = calculateMeanAndVariance(this.calibrationSamples);

        // Accept calibration if variance is below threshold (hand was steady)
        if (variance <= this.config.calibrationMaxVariance) {
          this.baselineDistance = mean;
          this.updateState({
            status: "tracking_active",
            baselineDistance: mean,
          });
        } else {
          // Hand moved too much during calibration; retain last half of samples and continue
          this.calibrationSamples = this.calibrationSamples.slice(
            Math.floor(this.config.calibrationFrames / 2),
          );
        }
      }

      this.scheduleNextFrame();
      return;
    }

    // ── Active Tracking & Gesture Classification ──
    const pinchState = classifyPinchState(currentDist, this.baselineDistance, this.config);
    const zoomDelta = computeZoomDelta(currentDist, this.baselineDistance, this.config);

    // Emit zoom delta only if motion tracker verifies intentional movement
    if (zoomDelta !== 0) {
      const shouldTrigger = this.motionTracker.shouldTriggerZoom(
        currentDist,
        pinchState,
        now,
        this.config.zoomCooldownMs,
      );

      if (shouldTrigger) {
        this.callbacks.onZoomDelta?.(zoomDelta);
      }
    }

    // Notify per-frame callback
    this.callbacks.onFrame?.({
      thumbTip: detection.thumbTip,
      indexTip: detection.indexTip,
      rawDistance,
      smoothedDistance: currentDist,
      baselineDistance: this.baselineDistance,
      deltaFromBaseline: currentDist - this.baselineDistance,
      pinchState,
      zoomDelta,
      confidence: detection.confidence,
      timestamp: now,
    });

    // Update public state when qualitative state shifts
    if (
      this._state.status !== "tracking_active" ||
      this._state.pinchState !== pinchState ||
      Math.abs(this._state.zoomDelta - zoomDelta) > 0.05
    ) {
      this.updateState({
        status: "tracking_active",
        pinchState,
        currentDistance: currentDist,
        zoomDelta,
      });
    }

    this.scheduleNextFrame();
  };

  // ── Lifecycle & Helpers ──────────────────────────────────────────────────

  private resetCalibration(): void {
    this.calibrationSamples = [];
    this.baselineDistance = null;
    this.smoothedDistance = 0;
    this.lostTrackingFrames = 0;
    this.motionTracker.reset();
  }

  private updateState(partial: Partial<TouchlessState>): void {
    const nextState: TouchlessState = { ...this._state, ...partial };
    const statusChanged = this._state.status !== nextState.status;
    this._state = nextState;

    if (statusChanged && nextState.status) {
      this.callbacks.onStatusChange?.(nextState.status);
    }
  }

  private handleInterruption(reason: string): void {
    this.cleanupMediaResources();
    this.updateState({
      isActive: false,
      status: "interrupted",
      errorMessage: reason,
      pinchState: "none",
      zoomDelta: 0,
    });
  }

  private handleVisibilityChange = (): void => {
    if (typeof document === "undefined") return;
    if (document.visibilityState === "hidden") {
      if (this.animationFrameId !== null) {
        cancelAnimationFrame(this.animationFrameId);
        this.animationFrameId = null;
      }
    } else if (document.visibilityState === "visible" && this._state.isActive) {
      this.scheduleNextFrame();
    }
  };

  private bindWindowVisibilityListeners(): void {
    if (typeof document === "undefined") return;
    document.addEventListener("visibilitychange", this.handleVisibilityChange);
  }

  private cleanupMediaResources(): void {
    if (typeof document !== "undefined") {
      document.removeEventListener("visibilitychange", this.handleVisibilityChange);
    }

    if (this.animationFrameId !== null) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }

    if (this.mediaStream) {
      try {
        for (const track of this.mediaStream.getTracks()) {
          track.onended = null;
          track.stop();
        }
      } catch (e) {
        console.warn("Error stopping media tracks:", e);
      }
      this.mediaStream = null;
    }

    if (this.videoElement) {
      try {
        this.videoElement.pause();
        this.videoElement.srcObject = null;
      } catch (e) {
        console.warn("Error clearing video element:", e);
      }
      this.videoElement = null;
    }
  }
}

/**
 * Framework-compatible React hook for Touchless Map Control.
 * Implemented in pure TypeScript (.ts) without any JSX markup.
 * Manages reactive state synchronization, Strict Mode cleanup, and unmount safety.
 */
export function useHandGesture(options: UseHandGestureOptions = {}): UseHandGestureReturn {
  const optionsRef = useRef(options);
  optionsRef.current = options;

  const [state, setState] = useState<TouchlessState>(() => ({
    isActive: false,
    isSupported: checkTouchlessCapability().isSupported,
    status: "idle",
    pinchState: "none",
    currentDistance: 0,
    baselineDistance: null,
    zoomDelta: 0,
    errorMessage: null,
  }));

  const controllerRef = useRef<TouchlessGestureController | null>(null);

  // Lazy controller initialization
  if (!controllerRef.current) {
    controllerRef.current = new TouchlessGestureController({
      ...options,
      onZoomDelta: (delta) => optionsRef.current.onZoomDelta?.(delta),
      onStatusChange: (status) => {
        setState((prev) => ({ ...prev, status }));
        optionsRef.current.onStatusChange?.(status);
      },
      onFrame: (frame) => optionsRef.current.onFrame?.(frame),
      onError: (err) => {
        setState((prev) => ({ ...prev, errorMessage: err.message }));
        optionsRef.current.onError?.(err);
      },
    });
  }

  const start = useCallback(async () => {
    if (controllerRef.current) {
      await controllerRef.current.start();
      setState(controllerRef.current.state);
    }
  }, []);

  const stop = useCallback(() => {
    if (controllerRef.current) {
      controllerRef.current.stop();
      setState(controllerRef.current.state);
    }
  }, []);

  const recalibrate = useCallback(() => {
    if (controllerRef.current) {
      controllerRef.current.recalibrate();
      setState(controllerRef.current.state);
    }
  }, []);

  const dispose = useCallback(() => {
    if (controllerRef.current) {
      controllerRef.current.dispose();
      setState(controllerRef.current.state);
    }
  }, []);

  // Sync state periodically during tracking transitions
  useEffect(() => {
    const interval = setInterval(() => {
      if (controllerRef.current && controllerRef.current.state.isActive) {
        setState(controllerRef.current.state);
      }
    }, 150);

    return () => clearInterval(interval);
  }, []);

  // Strict Mode lifecycle cleanup on component unmount
  useEffect(() => {
    return () => {
      controllerRef.current?.dispose();
      controllerRef.current = null;
    };
  }, []);

  return {
    state,
    isActive: state.isActive,
    isSupported: state.isSupported,
    status: state.status,
    pinchState: state.pinchState,
    baselineDistance: state.baselineDistance,
    currentDistance: state.currentDistance,
    errorMessage: state.errorMessage,
    start,
    stop,
    recalibrate,
    dispose,
  };
}
