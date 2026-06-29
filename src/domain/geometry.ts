import type { Point, Rect } from "./types";

interface NormalizedLandmark {
  x: number;
  y: number;
}

interface ViewportSize {
  width: number;
  height: number;
}

interface MappingOptions {
  mirrorX: boolean;
  overscanRatio?: number;
}

const clamp01 = (value: number) => Math.min(1, Math.max(0, value));

const mapNormalizedToViewportAxis = (value: number, size: number, overscanRatio: number) => {
  const expandedSize = size * (1 + overscanRatio * 2);
  const margin = size * overscanRatio;

  return Math.round(value * expandedSize - margin);
};

export const mapLandmarkToViewport = (
  landmark: NormalizedLandmark,
  viewport: ViewportSize,
  options: MappingOptions,
): Point => {
  const normalizedX = options.mirrorX ? 1 - clamp01(landmark.x) : clamp01(landmark.x);
  const normalizedY = clamp01(landmark.y);
  const overscanRatio = Math.max(0, options.overscanRatio ?? 0);

  return {
    x: mapNormalizedToViewportAxis(normalizedX, viewport.width, overscanRatio),
    y: mapNormalizedToViewportAxis(normalizedY, viewport.height, overscanRatio),
  };
};

export const pointInRect = (point: Point, rect: Rect): boolean =>
  point.x >= rect.left &&
  point.x <= rect.left + rect.width &&
  point.y >= rect.top &&
  point.y <= rect.top + rect.height;
