import { describe, expect, it } from "vitest";
import { handModelUrl } from "./trackingAssets";

describe("hand tracking assets", () => {
  it("loads the hand model from the app instead of a remote bucket at startup", () => {
    expect(handModelUrl).toBe("/models/hand_landmarker.task");
  });
});

