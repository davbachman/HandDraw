import { FilesetResolver, HandLandmarker, type HandLandmarkerResult, type Landmark, type NormalizedLandmark } from "@mediapipe/tasks-vision";
import { handModelUrl, wasmBaseUrl } from "./trackingAssets";

export interface HandTrackingFrame {
  result: HandLandmarkerResult;
  landmarks: NormalizedLandmark[] | null;
  hands: NormalizedLandmark[][];
  worldHands: Landmark[][];
}

export class HandTracker {
  private landmarker: HandLandmarker | null = null;
  private lastVideoTime = -1;

  async initialize(): Promise<void> {
    const vision = await FilesetResolver.forVisionTasks(wasmBaseUrl);
    this.landmarker = await HandLandmarker.createFromOptions(vision, {
      baseOptions: {
        modelAssetPath: handModelUrl,
        delegate: "GPU",
      },
      runningMode: "VIDEO",
      numHands: 2,
      minHandDetectionConfidence: 0.55,
      minHandPresenceConfidence: 0.55,
      minTrackingConfidence: 0.55,
    });
  }

  detect(video: HTMLVideoElement, timestamp: number): HandTrackingFrame | null {
    if (!this.landmarker || video.currentTime === this.lastVideoTime) {
      return null;
    }

    this.lastVideoTime = video.currentTime;
    const result = this.landmarker.detectForVideo(video, timestamp);

    return {
      result,
      hands: result.landmarks,
      worldHands: result.worldLandmarks,
      landmarks: result.landmarks[0] ?? null,
    };
  }
}

export const requestCameraStream = async (): Promise<MediaStream> => {
  if (!navigator.mediaDevices?.getUserMedia) {
    throw new Error("This browser does not expose camera access through getUserMedia.");
  }

  return navigator.mediaDevices.getUserMedia({
    video: {
      facingMode: "user",
      width: { ideal: 1280 },
      height: { ideal: 720 },
    },
    audio: false,
  });
};
