import { describe, it, expect } from "vitest";
import { matchScore } from "@/lib/match";

describe("matchScore", () => {
  it("is 100 when both fully teach each other", () => {
    const a = { skills_offered: ["Java"], skills_wanted: ["React"] };
    const b = { skills_offered: ["react"], skills_wanted: ["java"] };
    expect(matchScore(a, b).score).toBe(100);
  });
  it("is 50 when only one side benefits", () => {
    const a = { skills_offered: ["Java"], skills_wanted: ["React"] };
    const b = { skills_offered: ["React"], skills_wanted: ["Python"] };
    expect(matchScore(a, b).score).toBe(50);
  });
  it("is 0 with no overlap", () => {
    const a = { skills_offered: ["Java"], skills_wanted: ["SQL"] };
    const b = { skills_offered: ["Figma"], skills_wanted: ["C"] };
    expect(matchScore(a, b).score).toBe(0);
  });
});
