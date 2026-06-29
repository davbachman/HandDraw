import type { Point } from "./types";

interface Landmark3D {
  x: number;
  y: number;
  z?: number;
}

export interface TwoHandZoomState {
  baselineDistance: number;
  baselineZoom: number;
}

interface EdgeOnHandOptions {
  maxStackedFingerSpreadRatio: number;
  minFingerRiseRatio: number;
  minVerticalSpan: number;
}

const defaultEdgeOnHandOptions: EdgeOnHandOptions = {
  maxStackedFingerSpreadRatio: 0.4,
  minFingerRiseRatio: 0.35,
  minVerticalSpan: 0.18,
};

const fingerPairs = [
  { base: 5, tip: 8 },
  { base: 9, tip: 12 },
  { base: 13, tip: 16 },
  { base: 17, tip: 20 },
] as const;

export const getMidpoint = (first: Point, second: Point): Point => ({
  x: Math.round((first.x + second.x) / 2),
  y: Math.round((first.y + second.y) / 2),
});

export const calculatePointDistance = (first: Point, second: Point): number => Math.hypot(first.x - second.x, first.y - second.y);

const isUsableLandmark = (landmark: Landmark3D | undefined): landmark is Landmark3D =>
  Boolean(landmark && Number.isFinite(landmark.x) && Number.isFinite(landmark.y) && !(landmark.x === 0 && landmark.y === 0));

const isHandEdgeOnWithFingersUp = (landmarks: Landmark3D[], options: EdgeOnHandOptions): boolean => {
  const relevantLandmarks = fingerPairs.flatMap(({ base, tip }) => [landmarks[base], landmarks[tip]]);
  if (relevantLandmarks.some((landmark) => !isUsableLandmark(landmark))) {
    return false;
  }

  const xs = relevantLandmarks.map((landmark) => landmark.x);
  const ys = relevantLandmarks.map((landmark) => landmark.y);
  const horizontalSpread = Math.max(...xs) - Math.min(...xs);
  const verticalSpan = Math.max(...ys) - Math.min(...ys);
  const averageFingerRise =
    fingerPairs.reduce((sum, { base, tip }) => sum + (landmarks[base].y - landmarks[tip].y), 0) / fingerPairs.length;

  if (verticalSpan < options.minVerticalSpan || averageFingerRise <= 0) {
    return false;
  }

  return horizontalSpread / verticalSpan <= options.maxStackedFingerSpreadRatio && averageFingerRise / verticalSpan >= options.minFingerRiseRatio;
};

export const areHandsEdgeOnForZoom = (
  firstHand: Landmark3D[],
  secondHand: Landmark3D[],
  options: EdgeOnHandOptions = defaultEdgeOnHandOptions,
): boolean => isHandEdgeOnWithFingersUp(firstHand, options) && isHandEdgeOnWithFingersUp(secondHand, options);

export const beginTwoHandZoom = (baselineDistance: number, baselineZoom: number): TwoHandZoomState => ({
  baselineDistance,
  baselineZoom,
});

export const getTwoHandZoom = (state: TwoHandZoomState, currentDistance: number): number => {
  if (state.baselineDistance <= 0) {
    return state.baselineZoom;
  }

  return state.baselineZoom * (currentDistance / state.baselineDistance);
};
