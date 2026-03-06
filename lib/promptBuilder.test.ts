import { describe, expect, it } from "vitest";
import { buildPrompt, buildVariationPrompt } from "./promptBuilder";

describe("buildPrompt", () => {
  it("includes the vibe in the prompt", () => {
    const prompt = buildPrompt("dark trap beat");
    expect(prompt).toContain("dark trap beat");
    expect(prompt).toContain('Vibe or song: "dark trap beat"');
  });

  it("instructs JSON only, no markdown", () => {
    const prompt = buildPrompt("chill lofi");
    expect(prompt).toContain("JSON object ONLY");
    expect(prompt).toContain("no markdown code fences");
  });

  it("includes schema with progression, bpm, scale, mode, mood_tags, explanation", () => {
    const prompt = buildPrompt("vibe");
    expect(prompt).toContain("progression");
    expect(prompt).toContain("bpm");
    expect(prompt).toContain("scale");
    expect(prompt).toContain("mode");
    expect(prompt).toContain("mood_tags");
    expect(prompt).toContain("explanation");
  });
});

describe("buildVariationPrompt", () => {
  it("includes current progression and scale", () => {
    const prompt = buildVariationPrompt(["Cm", "Ab", "Bb", "Gm"], "C Minor");
    expect(prompt).toContain("Cm");
    expect(prompt).toContain("C Minor");
    expect(prompt).toContain("Cm → Ab → Bb → Gm");
  });

  it("includes hint when provided", () => {
    const prompt = buildVariationPrompt(["Am", "F", "G"], "A Minor", "darker");
    expect(prompt).toContain("darker");
    expect(prompt).toContain("Modify the progression to be more: darker");
  });

  it("asks for creative variation when no hint", () => {
    const prompt = buildVariationPrompt(["C", "G", "Am", "F"], "C Major");
    expect(prompt).toContain("creative variation");
  });

  it("uses same JSON schema as main prompt", () => {
    const prompt = buildVariationPrompt(["Dm", "G"], "D Minor");
    expect(prompt).toContain("progression");
    expect(prompt).toContain("bpm");
    expect(prompt).toContain("scale");
    expect(prompt).toContain("mode");
  });
});
