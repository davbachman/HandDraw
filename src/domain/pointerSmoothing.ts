import type { Point } from "./types";

export interface PointerSmoothingOptions {
  alpha: number;
  snapDistance: number;
}

export const defaultSmoothingOptions: PointerSmoothingOptions = {
  alpha: 0.26,
  snapDistance: 170,
};

export const drawingSmoothingOptions: PointerSmoothingOptions = {
  alpha: 0.42,
  snapDistance: 170,
};

export const smoothPointer = (previous: Point | null, raw: Point, options: PointerSmoothingOptions = defaultSmoothingOptions): Point => {
  if (!previous) {
    return raw;
  }

  if (Math.hypot(raw.x - previous.x, raw.y - previous.y) > options.snapDistance) {
    return raw;
  }

  return {
    x: previous.x + (raw.x - previous.x) * options.alpha,
    y: previous.y + (raw.y - previous.y) * options.alpha,
  };
};
