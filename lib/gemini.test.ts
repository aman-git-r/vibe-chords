import { describe, expect, it } from "vitest";
import {
  cleanJsonResponse,
  validateChordData,
} from "./gemini";

describe("cleanJsonResponse", () => {
  it("returns plain JSON unchanged", () => {
    const json = '{"progression":["Cm"],"bpm":[120,140],"scale":"C Minor","mode":"Aeolian","mood_tags":[],"explanation":""}';
    expect(cleanJsonResponse(json)).toBe(json);
  });

  it("strips markdown code fences", () => {
    const wrapped = '```json\n{"progression":["Cm"],"bpm":[120,140],"scale":"C","mode":"Aeolian","mood_tags":[],"explanation":""}\n```';
    const result = cleanJsonResponse(wrapped);
    expect(result).not.toContain("```");
    expect(JSON.parse(result).progression).toEqual(["Cm"]);
  });

  it("strips code fences (uppercase JSON)", () => {
    const wrapped = '```JSON\n{"progression":["F"]}\n```';
    const result = cleanJsonResponse(wrapped);
    expect(JSON.parse(result).progression).toEqual(["F"]);
  });

  it("extracts JSON from surrounding text", () => {
    const withPreamble = 'Here is the chord progression:\n{"progression":["Am","F","G","C"],"bpm":[90,100],"scale":"C","mode":"Ionian","mood_tags":[],"explanation":""}\nHope this helps!';
    const result = cleanJsonResponse(withPreamble);
    const parsed = JSON.parse(result);
    expect(parsed.progression).toEqual(["Am", "F", "G", "C"]);
  });

  it("throws when no JSON object found", () => {
    expect(() => cleanJsonResponse("no braces here")).toThrow("No JSON object found");
    expect(() => cleanJsonResponse("")).toThrow("No JSON object found");
  });
});

describe("validateChordData", () => {
  const valid = {
    progression: ["Cm", "Ab", "Bb", "Gm"],
    bpm: [140, 160],
    scale: "C Minor",
    mode: "Aeolian",
    mood_tags: ["dark", "tense"],
    explanation: "Minor progression.",
  };

  it("returns valid data unchanged", () => {
    const result = validateChordData(valid);
    expect(result.progression).toEqual(valid.progression);
    expect(result.bpm).toEqual([140, 160]);
    expect(result.scale).toBe("C Minor");
    expect(result.mode).toBe("Aeolian");
  });

  it("throws when progression is missing or invalid", () => {
    expect(() => validateChordData({ ...valid, progression: [] })).toThrow(
      "Invalid progression"
    );
    expect(() => validateChordData({ ...valid, progression: ["Cm", 123] })).toThrow(
      "Invalid progression"
    );
    expect(() => validateChordData({ ...valid, progression: undefined })).toThrow(
      "Invalid progression"
    );
  });

  it("normalizes single-number bpm to range", () => {
    const data = { ...valid, bpm: 128 };
    const result = validateChordData(data);
    expect(result.bpm).toEqual([128, 148]);
  });

  it("uses default bpm when bpm is invalid", () => {
    const result = validateChordData({ ...valid, bpm: "fast" });
    expect(result.bpm).toEqual([120, 140]);
  });

  it("throws when scale is not a string", () => {
    expect(() => validateChordData({ ...valid, scale: 123 })).toThrow(
      "Invalid scale"
    );
  });

  it("throws when mode is not a string", () => {
    expect(() => validateChordData({ ...valid, mode: null })).toThrow(
      "Invalid mode"
    );
  });

  it("defaults explanation to empty string when missing", () => {
    const result = validateChordData({
      progression: valid.progression,
      bpm: valid.bpm,
      scale: valid.scale,
      mode: valid.mode,
      mood_tags: valid.mood_tags,
    });
    expect(result.explanation).toBe("");
  });

  it("defaults mood_tags to empty array when missing or invalid", () => {
    const result = validateChordData({ ...valid, mood_tags: undefined });
    expect(result.mood_tags).toEqual([]);
    const result2 = validateChordData({ ...valid, mood_tags: [1, 2] });
    expect(result2.mood_tags).toEqual([]);
  });
});
