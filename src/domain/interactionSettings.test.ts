import { describe, expect, it } from "vitest";
import { cameraInputOverscanRatio, getCameraInputOverscanRatio, viewportZoomRange } from "./interactionSettings";

describe("viewportZoomRange", () => {
  it("allows a wider two-hand zoom range for close detail work and broad overviews", () => {
    expect(viewportZoomRange).toEqual({
      min: 0.25,
      max: 6,
    });
  });
});

describe("getCameraInputOverscanRatio", () => {
  it("keeps the standard camera overscan outside portrait mobile", () => {
    expect(getCameraInputOverscanRatio({ width: 1280, height: 720 })).toBe(cameraInputOverscanRatio);
    expect(getCameraInputOverscanRatio({ width: 844, height: 390 })).toBe(cameraInputOverscanRatio);
  });

  it("uses a wider camera overscan in portrait mobile so the hand can reach the canvas edge before tracking drops", () => {
    expect(getCameraInputOverscanRatio({ width: 390, height: 844 })).toBeGreaterThan(cameraInputOverscanRatio);
  });
});
