interface ClosestTarget {
  closest(selector: string): unknown;
}

const interactiveSelector = "input, select, textarea, a, [data-pointer-fallback='ignore']";

const hasClosest = (target: EventTarget | ClosestTarget | null): target is ClosestTarget =>
  Boolean(target && typeof (target as ClosestTarget).closest === "function");

export const shouldHandlePointerFallback = (target: EventTarget | ClosestTarget | null): boolean => {
  if (!hasClosest(target)) {
    return true;
  }

  return !target.closest(interactiveSelector);
};

export const shouldTrackPointerFallback = (_target: EventTarget | ClosestTarget | null): boolean => true;
