import type { Point, Rect, Size } from "./types";

const clamp = (value: number, min: number, max: number): number => Math.min(max, Math.max(min, value));

export interface ViewportState {
  offset: Point;
  zoom: number;
}

export interface ViewportZoomRange {
  min: number;
  max: number;
}

const normalizeZoom = (zoom: number): number => (Number.isFinite(zoom) && zoom > 0 ? zoom : 1);

const visibleWorldSize = (viewportSize: Size, zoom: number): Size => {
  const safeZoom = normalizeZoom(zoom);

  return {
    width: viewportSize.width / safeZoom,
    height: viewportSize.height / safeZoom,
  };
};

export const viewportPointToWorld = (viewportPoint: Point, canvasRect: Rect, viewportOffset: Point, viewportZoom = 1): Point => ({
  x: Math.round((viewportPoint.x - canvasRect.left) / normalizeZoom(viewportZoom) + viewportOffset.x),
  y: Math.round((viewportPoint.y - canvasRect.top) / normalizeZoom(viewportZoom) + viewportOffset.y),
});

export const clampViewportOffset = (viewportOffset: Point, viewportSize: Size, worldSize: Size, viewportZoom = 1): Point => ({
  x: Math.round(clamp(viewportOffset.x, 0, Math.max(0, worldSize.width - visibleWorldSize(viewportSize, viewportZoom).width))),
  y: Math.round(clamp(viewportOffset.y, 0, Math.max(0, worldSize.height - visibleWorldSize(viewportSize, viewportZoom).height))),
});

export const panViewportOffset = (viewportOffset: Point, pointerDelta: Point, viewportSize: Size, worldSize: Size, viewportZoom = 1): Point =>
  clampViewportOffset(
    {
      x: viewportOffset.x - pointerDelta.x / normalizeZoom(viewportZoom),
      y: viewportOffset.y - pointerDelta.y / normalizeZoom(viewportZoom),
    },
    viewportSize,
    worldSize,
    viewportZoom,
  );

export const centerViewportOffset = (worldSize: Size, viewportSize: Size, viewportZoom = 1): Point =>
  clampViewportOffset(
    {
      x: (worldSize.width - visibleWorldSize(viewportSize, viewportZoom).width) / 2,
      y: (worldSize.height - visibleWorldSize(viewportSize, viewportZoom).height) / 2,
    },
    viewportSize,
    worldSize,
    viewportZoom,
  );

export const expandWorldSizeToCoverViewport = (worldSize: Size, viewportOffset: Point, viewportSize: Size, viewportZoom = 1): Size => {
  const visibleSize = visibleWorldSize(viewportSize, viewportZoom);

  return {
    width: Math.max(worldSize.width, Math.ceil(viewportOffset.x + visibleSize.width)),
    height: Math.max(worldSize.height, Math.ceil(viewportOffset.y + visibleSize.height)),
  };
};

export const zoomViewportAtPoint = (
  state: ViewportState,
  nextZoom: number,
  focalPoint: Point,
  canvasRect: Rect,
  worldSize: Size,
  range: ViewportZoomRange,
): ViewportState => {
  const zoom = clamp(nextZoom, range.min, range.max);
  const localPoint = {
    x: focalPoint.x - canvasRect.left,
    y: focalPoint.y - canvasRect.top,
  };
  const focalWorldPoint = {
    x: state.offset.x + localPoint.x / normalizeZoom(state.zoom),
    y: state.offset.y + localPoint.y / normalizeZoom(state.zoom),
  };
  const offset = clampViewportOffset(
    {
      x: focalWorldPoint.x - localPoint.x / normalizeZoom(zoom),
      y: focalWorldPoint.y - localPoint.y / normalizeZoom(zoom),
    },
    { width: canvasRect.width, height: canvasRect.height },
    worldSize,
    zoom,
  );

  return { offset, zoom };
};
