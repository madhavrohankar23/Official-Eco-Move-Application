/**
 * @file handDetection.ts
 * MediaPipe Tasks Vision lifecycle management, local model loading,
 * and hand-landmark extraction for Touchless Map Control.
 */

import type { GestureConfig, NormalizedLandmark } from "./gestureTypes";
import { HAND_LANDMARK } from "./gestureTypes";
import { DEFAULT_GESTURE_CONFIG, GESTURE_MODEL_ASSETS } from "./gestureSettings";

/**
 * Result of a single video frame detection.
 */
export interface HandDetectionResult {
  landmarks: NormalizedLandmark[];
  thumbTip: NormalizedLandmark;
  indexTip: NormalizedLandmark;
  wrist: NormalizedLandmark;
  confidence: number;
  timestamp: number;
}

/**
 * Type interface for the underlying MediaPipe HandLandmarker instance.
 * Allows type safety without tight build-time coupling or SSR evaluation issues.
 */
interface MediaPipeHandLandmarker {
  detectForVideo(
    videoFrame: HTMLVideoElement,
    timestampMs: number,
  ): {
    landmarks: NormalizedLandmark[][];
    handednesses: { score: number; categoryName: string }[][];
  };
  close(): void;
}

/**
 * Encapsulates the MediaPipe HandLandmarker model lifecycle.
 * Manages loading, inference, and disposal with zero biometric data persistence.
 */
export class HandDetector {
  private landmarker: MediaPipeHandLandmarker | null = null;
  private isInitializing = false;
  private isDisposed = false;

  /**
   * Asynchronously loads the MediaPipe Vision runtime and initializes
   * the HandLandmarker model with local static assets and reliable CDN fallback.
   */
  public async initialize(config: GestureConfig = DEFAULT_GESTURE_CONFIG): Promise<void> {
    if (this.landmarker || this.isInitializing || this.isDisposed) {
      return;
    }

    if (typeof window === "undefined") {
      throw new Error("HandDetector cannot be initialized in a non-browser environment.");
    }

    this.isInitializing = true;

    try {
      // Dynamic import to honor TanStack Start server/client boundary
      const vision = await import("@mediapipe/tasks-vision");

      // Native inline documents load pinned HTTPS assets; web uses shipped files.
      const native = Boolean((window as any).ReactNativeWebView);
      const locations = native
        ? [[GESTURE_MODEL_ASSETS.cdnWasmPath, GESTURE_MODEL_ASSETS.cdnModelPath]]
        : [[GESTURE_MODEL_ASSETS.localWasmPath, GESTURE_MODEL_ASSETS.localModelPath],
           [GESTURE_MODEL_ASSETS.cdnWasmPath, GESTURE_MODEL_ASSETS.cdnModelPath]];
      let landmarkerInstance: MediaPipeHandLandmarker | null = null;
      let lastError: unknown;
      for (const [wasm, model] of locations) {
        if (this.isDisposed) return;
        try {
          const files = await vision.FilesetResolver.forVisionTasks(wasm);
          for (const delegate of ['GPU', 'CPU'] as const) {
            if (this.isDisposed) return;
            try {
              landmarkerInstance = await vision.HandLandmarker.createFromOptions(files, {
                baseOptions: {modelAssetPath: model, delegate},
                runningMode: 'VIDEO', numHands: 1,
                minHandDetectionConfidence: config.minDetectionConfidence,
                minHandPresenceConfidence: config.minDetectionConfidence,
                minTrackingConfidence: config.minTrackingConfidence,
              }) as unknown as MediaPipeHandLandmarker;
              break;
            } catch (error) { lastError = error; }
          }
        } catch (error) { lastError = error; }
        if (landmarkerInstance) break;
      }
      if (!landmarkerInstance && !this.isDisposed) {
        throw new Error('Hand tracking assets could not load. Check your internet connection and retry.', {cause: lastError});
      }

      if (this.isDisposed) {
        landmarkerInstance?.close();
        return;
      }

      this.landmarker = landmarkerInstance;
    } finally {
      this.isInitializing = false;
    }
  }

  /**
   * Performs real-time inference on a video frame and extracts thumb and index fingertips.
   * Returns null if no hand is detected or confidence is below threshold.
   */
  public detect(video: HTMLVideoElement, timestamp: number): HandDetectionResult | null {
    if (!this.landmarker || this.isDisposed) {
      return null;
    }

    // Video must have valid dimensions and ready state
    if (video.readyState < HTMLMediaElement.HAVE_CURRENT_DATA || video.videoWidth === 0) {
      return null;
    }

    try {
      const result = this.landmarker.detectForVideo(video, timestamp);
      const firstHandLandmarks = result.landmarks?.[0];

      if (!firstHandLandmarks || firstHandLandmarks.length < 21) {
        return null;
      }

      const thumbTip = firstHandLandmarks[HAND_LANDMARK.THUMB_TIP];
      const indexTip = firstHandLandmarks[HAND_LANDMARK.INDEX_FINGER_TIP];
      const wrist = firstHandLandmarks[HAND_LANDMARK.WRIST];

      if (!thumbTip || !indexTip || !wrist) {
        return null;
      }

      const confidence = result.handednesses?.[0]?.[0]?.score ?? 0.85;

      return {
        landmarks: firstHandLandmarks,
        thumbTip,
        indexTip,
        wrist,
        confidence,
        timestamp,
      };
    } catch (err) {
      console.warn("Hand inference skipped for frame:", err);
      return null;
    }
  }

  /**
   * Returns true if the model has loaded and is ready to process frames.
   */
  public isReady(): boolean {
    return this.landmarker !== null && !this.isDisposed;
  }

  /**
   * Releases model instances, terminates active WebAssembly threads,
   * and disposes of all resources.
   */
  public dispose(): void {
    this.isDisposed = true;
    if (this.landmarker) {
      try {
        this.landmarker.close();
      } catch (e) {
        console.warn("Error closing HandLandmarker:", e);
      }
      this.landmarker = null;
    }
  }
}
