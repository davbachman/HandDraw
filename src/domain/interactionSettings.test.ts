import { describe, expect, it } from "vitest";
import { viewportZoomRange } from "./interactionSettings";

describe("viewportZoomRange", () => {
  it("allows a wider two-hand zoom range for close detail work and broad overviews", () => {
    expect(viewportZoomRange).toEqual({
      min: 0.25,
      max: 6,
    });
  });
});
