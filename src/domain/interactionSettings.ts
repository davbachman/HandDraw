import type { ViewportZoomRange } from "./viewport";

export const viewportZoomRange: ViewportZoomRange = {
  min: 0.25,
  max: 6,
};

export const zoomDeadband = 0.005;

export const cameraInputOverscanRatio = 0.15;

const portraitMobileCameraInputOverscanRatio = 0.3;

interface ViewportSize {
  width: number;
  height: number;
}

export const getCameraInputOverscanRatio = (viewport: ViewportSize): number => {
  if (viewport.width <= 720 && viewport.height > viewport.width) {
    return portraitMobileCameraInputOverscanRatio;
  }

  return cameraInputOverscanRatio;
};
