import { beforeEach, describe, expect, it, vi } from "vitest";

const mediaPipe = vi.hoisted(() => ({
  createFromOptions: vi.fn(),
  detectForVideo: vi.fn(),
  forVisionTasks: vi.fn(),
}));

vi.mock("@mediapipe/tasks-vision", () => ({
  FilesetResolver: {
    forVisionTasks: mediaPipe.forVisionTasks,
  },
  HandLandmarker: {
    createFromOptions: mediaPipe.createFromOptions,
  },
}));

vi.mock("./trackingAssets", () => ({
  handModelUrl: "/models/hand_landmarker.task",
  wasmBaseUrl: "/wasm",
}));

import { HandTracker } from "./tracking";

const landmark = (x: number, y: number) => ({ x, y, z: 0 });

describe("HandTracker", () => {
  beforeEach(() => {
    mediaPipe.createFromOptions.mockReset();
    mediaPipe.detectForVideo.mockReset();
    mediaPipe.forVisionTasks.mockReset();
    mediaPipe.forVisionTasks.mockResolvedValue("vision");
    mediaPipe.createFromOptions.mockResolvedValue({
      detectForVideo: mediaPipe.detectForVideo,
    });
  });

  it("configures MediaPipe to track two hands", async () => {
    const tracker = new HandTracker();

    await tracker.initialize();

    expect(mediaPipe.createFromOptions).toHaveBeenCalledWith(
      "vision",
      expect.objectContaining({
        numHands: 2,
      }),
    );
  });

  it("returns every detected hand while preserving the primary hand", async () => {
    const tracker = new HandTracker();
    const primaryHand = Array.from({ length: 21 }, () => landmark(0.2, 0.3));
    const secondaryHand = Array.from({ length: 21 }, () => landmark(0.7, 0.4));
    const primaryWorldHand = Array.from({ length: 21 }, () => landmark(0.02, 0.03));
    const secondaryWorldHand = Array.from({ length: 21 }, () => landmark(0.07, 0.04));
    mediaPipe.detectForVideo.mockReturnValue({
      landmarks: [primaryHand, secondaryHand],
      worldLandmarks: [primaryWorldHand, secondaryWorldHand],
    });

    await tracker.initialize();
    const frame = tracker.detect({ currentTime: 1 } as HTMLVideoElement, 100);

    expect(frame?.landmarks).toBe(primaryHand);
    expect(frame?.hands).toEqual([primaryHand, secondaryHand]);
    expect(frame?.worldHands).toEqual([primaryWorldHand, secondaryWorldHand]);
  });
});
