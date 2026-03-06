import { describe, expect, it } from "vitest";
import { chordToNotes } from "./chordToNotes";

describe("chordToNotes", () => {
  it("converts major triad (no suffix) to notes at default octave", () => {
    expect(chordToNotes("C")).toEqual(["C4", "E4", "G4"]);
    expect(chordToNotes("G")).toEqual(["G4", "B4", "D5"]);
  });

  it("converts minor chord", () => {
    expect(chordToNotes("Cm")).toEqual(["C4", "D#4", "G4"]);
    expect(chordToNotes("Am")).toEqual(["A4", "C5", "E5"]);
  });

  it("converts minor 7th", () => {
    const notes = chordToNotes("Cm7");
    expect(notes).toHaveLength(4);
    expect(notes).toContain("C4");
    expect(notes).toContain("D#4");
    expect(notes).toContain("G4");
    expect(notes).toContain("A#4");
  });

  it("handles sharps in root", () => {
    expect(chordToNotes("F#m")).toEqual(["F#4", "A4", "C#5"]);
  });

  it("normalizes flats to sharps (enharmonic)", () => {
    const bb = chordToNotes("Bb");
    expect(bb[0]).toBe("A#4");
    const eb = chordToNotes("Ebm");
    expect(eb).toContain("D#4");
  });

  it("uses custom octave", () => {
    expect(chordToNotes("C", 3)).toEqual(["C3", "E3", "G3"]);
    expect(chordToNotes("C", 5)).toEqual(["C5", "E5", "G5"]);
  });

  it("trims whitespace from chord name", () => {
    expect(chordToNotes("  Cm  ")).toEqual(["C4", "D#4", "G4"]);
  });

  it("handles maj7", () => {
    const notes = chordToNotes("Fmaj7");
    expect(notes).toHaveLength(4);
    expect(notes[0]).toBe("F4");
  });

  it("handles diminished", () => {
    const notes = chordToNotes("Bdim");
    expect(notes).toHaveLength(3);
  });
});
