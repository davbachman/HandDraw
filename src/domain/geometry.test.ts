import { describe, expect, it } from "vitest";
import { mapLandmarkToViewport, pointInRect } from "./geometry";

describe("mapLandmarkToViewport", () => {
  it("mirrors normalized webcam x coordinates into viewport coordinates", () => {
    const point = mapLandmarkToViewport(
      { x: 0.25, y: 0.4 },
      { width: 1200, height: 800 },
      { mirrorX: true },
    );

    expect(point).toEqual({ x: 900, y: 320 });
  });

  it("clamps landmarks outside the expected normalized range", () => {
    const point = mapLandmarkToViewport(
      { x: -0.2, y: 1.4 },
      { width: 1000, height: 500 },
      { mirrorX: false },
    );

    expect(point).toEqual({ x: 0, y: 500 });
  });

  it("can map camera edges outside the viewport with overscan", () => {
    const topLeft = mapLandmarkToViewport(
      { x: 0, y: 0 },
      { width: 1000, height: 500 },
      { mirrorX: false, overscanRatio: 0.15 },
    );
    const bottomRight = mapLandmarkToViewport(
      { x: 1, y: 1 },
      { width: 1000, height: 500 },
      { mirrorX: false, overscanRatio: 0.15 },
    );

    expect(topLeft).toEqual({ x: -150, y: -75 });
    expect(bottomRight).toEqual({ x: 1150, y: 575 });
  });

  it("lets mirrored pointer movement reach the far right before the camera edge", () => {
    const point = mapLandmarkToViewport(
      { x: 0.1, y: 0.5 },
      { width: 1000, height: 500 },
      { mirrorX: true, overscanRatio: 0.15 },
    );

    expect(point).toEqual({ x: 1020, y: 250 });
  });
});

describe("pointInRect", () => {
  it("treats rect edges as valid drop targets", () => {
    expect(pointInRect({ x: 80, y: 30 }, { left: 80, top: 30, width: 400, height: 260 })).toBe(true);
    expect(pointInRect({ x: 480, y: 290 }, { left: 80, top: 30, width: 400, height: 260 })).toBe(true);
  });
});
