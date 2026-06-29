interface Landmark3D {
  x: number;
  y: number;
  z?: number;
}

interface PinchThresholds {
  start: number;
  end: number;
}

interface FistThresholds {
  start: number;
  end: number;
}

const defaultThresholds: PinchThresholds = {
  start: 0.24,
  end: 0.34,
};

const defaultFistThresholds: FistThresholds = {
  start: 1.18,
  end: 1.38,
};

const distance = (a: Landmark3D, b: Landmark3D): number => {
  const dz = (a.z ?? 0) - (b.z ?? 0);
  return Math.hypot(a.x - b.x, a.y - b.y, dz);
};

export const calculatePinchRatio = (landmarks: Landmark3D[]): number => {
  const wrist = landmarks[0];
  const indexBase = landmarks[5];
  const thumbTip = landmarks[4];
  const indexTip = landmarks[8];

  if (!wrist || !indexBase || !thumbTip || !indexTip) {
    return Number.POSITIVE_INFINITY;
  }

  const palmScale = distance(wrist, indexBase);
  if (palmScale === 0) {
    return Number.POSITIVE_INFINITY;
  }

  return distance(thumbTip, indexTip) / palmScale;
};

const fingerPairs = [
  { base: 5, tip: 8 },
  { base: 9, tip: 12 },
  { base: 13, tip: 16 },
  { base: 17, tip: 20 },
] as const;

export const calculateFingerExtensionRatio = (landmarks: Landmark3D[]): number => {
  const wrist = landmarks[0];
  if (!wrist) {
    return Number.POSITIVE_INFINITY;
  }

  const ratios = fingerPairs.flatMap(({ base, tip }) => {
    const baseLandmark = landmarks[base];
    const tipLandmark = landmarks[tip];
    if (!baseLandmark || !tipLandmark) {
      return [];
    }

    const baseDistance = distance(wrist, baseLandmark);
    if (baseDistance === 0) {
      return [];
    }

    return distance(wrist, tipLandmark) / baseDistance;
  });

  if (ratios.length === 0) {
    return Number.POSITIVE_INFINITY;
  }

  return ratios.reduce((sum, ratio) => sum + ratio, 0) / ratios.length;
};

export const nextPinchState = (
  wasPinching: boolean,
  pinchRatio: number,
  thresholds: PinchThresholds = defaultThresholds,
): boolean => {
  if (wasPinching) {
    return pinchRatio < thresholds.end;
  }

  return pinchRatio < thresholds.start;
};

export const nextFistState = (
  wasFist: boolean,
  fingerExtensionRatio: number,
  thresholds: FistThresholds = defaultFistThresholds,
): boolean => {
  if (wasFist) {
    return fingerExtensionRatio < thresholds.end;
  }

  return fingerExtensionRatio < thresholds.start;
};
