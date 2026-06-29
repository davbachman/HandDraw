import { describe, expect, it } from "vitest";
import { calculateFingerExtensionRatio, calculatePinchRatio, nextFistState, nextPinchState } from "./gesture";

const landmark = (x: number, y: number) => ({ x, y, z: 0 });

describe("calculatePinchRatio", () => {
  it("normalizes thumb-index distance by palm scale", () => {
    const landmarks = Array.from({ length: 21 }, () => landmark(0, 0));
    landmarks[0] = landmark(0.1, 0.5);
    landmarks[5] = landmark(0.5, 0.5);
    landmarks[4] = landmark(0.2, 0.5);
    landmarks[8] = landmark(0.3, 0.5);

    expect(calculatePinchRatio(landmarks)).toBeCloseTo(0.25);
  });
});

describe("nextPinchState", () => {
  it("uses hysteresis so small distance changes do not flicker", () => {
    expect(nextPinchState(false, 0.21)).toBe(true);
    expect(nextPinchState(true, 0.28)).toBe(true);
    expect(nextPinchState(true, 0.36)).toBe(false);
  });
});

describe("calculateFingerExtensionRatio", () => {
  it("returns a high ratio for an open hand and a low ratio for a closed fist", () => {
    const openHand = Array.from({ length: 21 }, () => landmark(0, 0));
    openHand[0] = landmark(0.5, 0.9);
    openHand[5] = landmark(0.35, 0.6);
    openHand[8] = landmark(0.35, 0.18);
    openHand[9] = landmark(0.5, 0.56);
    openHand[12] = landmark(0.5, 0.1);
    openHand[13] = landmark(0.65, 0.6);
    openHand[16] = landmark(0.65, 0.2);
    openHand[17] = landmark(0.78, 0.68);
    openHand[20] = landmark(0.78, 0.34);

    const fist = Array.from({ length: 21 }, () => landmark(0, 0));
    fist[0] = landmark(0.5, 0.9);
    fist[5] = landmark(0.35, 0.6);
    fist[8] = landmark(0.44, 0.72);
    fist[9] = landmark(0.5, 0.56);
    fist[12] = landmark(0.5, 0.72);
    fist[13] = landmark(0.65, 0.6);
    fist[16] = landmark(0.56, 0.72);
    fist[17] = landmark(0.78, 0.68);
    fist[20] = landmark(0.63, 0.78);

    expect(calculateFingerExtensionRatio(openHand)).toBeGreaterThan(1.5);
    expect(calculateFingerExtensionRatio(fist)).toBeLessThan(1.25);
  });
});

describe("nextFistState", () => {
  it("uses hysteresis so borderline finger motion does not flicker panning", () => {
    expect(nextFistState(false, 1.14)).toBe(true);
    expect(nextFistState(true, 1.3)).toBe(true);
    expect(nextFistState(true, 1.48)).toBe(false);
  });
});
