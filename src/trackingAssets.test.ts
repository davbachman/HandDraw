import { describe, expect, it } from "vitest";
import viteConfig from "../vite.config";
import { handModelUrl } from "./trackingAssets";

describe("hand tracking assets", () => {
  it("loads the hand model from the app under the configured base path", () => {
    expect(handModelUrl).toBe(`${viteConfig.base}models/hand_landmarker.task`);
  });
});
