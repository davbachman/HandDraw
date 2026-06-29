import { describe, expect, it } from "vitest";
import { areHandsEdgeOnForZoom, beginTwoHandZoom, calculatePointDistance, getMidpoint, getTwoHandZoom } from "./twoHandZoom";

const emptyHand = () => Array.from({ length: 21 }, () => ({ x: 0, y: 0, z: 0 }));

const edgeOnUpwardHand = (centerX: number) => {
  const hand = emptyHand();
  hand[0] = { x: centerX, y: 0.78, z: 0 };
  hand[5] = { x: centerX - 0.015, y: 0.56, z: 0 };
  hand[8] = { x: centerX - 0.005, y: 0.22, z: 0 };
  hand[9] = { x: centerX, y: 0.55, z: 0 };
  hand[12] = { x: centerX + 0.005, y: 0.18, z: 0 };
  hand[13] = { x: centerX + 0.012, y: 0.56, z: 0 };
  hand[16] = { x: centerX + 0.015, y: 0.24, z: 0 };
  hand[17] = { x: centerX + 0.02, y: 0.59, z: 0 };
  hand[20] = { x: centerX + 0.018, y: 0.32, z: 0 };
  return hand;
};

const spreadPalmHand = (centerX: number) => {
  const hand = edgeOnUpwardHand(centerX);
  hand[5] = { x: centerX - 0.14, y: 0.56, z: 0 };
  hand[8] = { x: centerX - 0.18, y: 0.22, z: 0 };
  hand[9] = { x: centerX - 0.04, y: 0.55, z: 0 };
  hand[12] = { x: centerX - 0.02, y: 0.18, z: 0 };
  hand[13] = { x: centerX + 0.06, y: 0.56, z: 0 };
  hand[16] = { x: centerX + 0.1, y: 0.24, z: 0 };
  hand[17] = { x: centerX + 0.14, y: 0.59, z: 0 };
  hand[20] = { x: centerX + 0.18, y: 0.32, z: 0 };
  return hand;
};

const sidewaysFingerHand = (centerX: number) => {
  const hand = edgeOnUpwardHand(centerX);
  hand[8] = { x: centerX - 0.005, y: 0.58, z: 0 };
  hand[12] = { x: centerX + 0.005, y: 0.57, z: 0 };
  hand[16] = { x: centerX + 0.015, y: 0.58, z: 0 };
  hand[20] = { x: centerX + 0.018, y: 0.6, z: 0 };
  return hand;
};

describe("two-hand zoom helpers", () => {
  it("uses the midpoint between two hands as the zoom focal point", () => {
    expect(getMidpoint({ x: 200, y: 160 }, { x: 520, y: 340 })).toEqual({
      x: 360,
      y: 250,
    });
  });

  it("maps hand distance changes into proportional zoom changes", () => {
    const state = beginTwoHandZoom(300, 1.2);

    expect(getTwoHandZoom(state, 450)).toBeCloseTo(1.8);
    expect(getTwoHandZoom(state, 150)).toBeCloseTo(0.6);
  });

  it("keeps the current zoom when the baseline distance cannot be measured", () => {
    const state = beginTwoHandZoom(0, 1.4);

    expect(getTwoHandZoom(state, 250)).toBe(1.4);
  });

  it("measures hand distance in viewport pixels", () => {
    expect(calculatePointDistance({ x: 10, y: 20 }, { x: 40, y: 60 })).toBe(50);
  });

  it("accepts zoom when both hands are edge-on with fingers pointing upward", () => {
    expect(areHandsEdgeOnForZoom(edgeOnUpwardHand(0.35), edgeOnUpwardHand(0.65))).toBe(true);
  });

  it("rejects zoom when one hand shows a spread palm instead of stacked fingers", () => {
    expect(areHandsEdgeOnForZoom(edgeOnUpwardHand(0.35), spreadPalmHand(0.65))).toBe(false);
  });

  it("rejects zoom when one hand does not have fingers pointing upward", () => {
    expect(areHandsEdgeOnForZoom(edgeOnUpwardHand(0.35), sidewaysFingerHand(0.65))).toBe(false);
  });

  it("rejects zoom when required finger landmarks are missing", () => {
    const incomplete = edgeOnUpwardHand(0.35);
    incomplete[12] = { x: 0, y: 0, z: 0 };

    expect(areHandsEdgeOnForZoom(incomplete, edgeOnUpwardHand(0.65))).toBe(false);
  });
});
