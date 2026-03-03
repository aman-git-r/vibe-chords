/**
 * chordToNotes.ts — Converts chord symbols into Tone.js-compatible note arrays.
 *
 * The AI returns chords as symbols like "Cm7" or "Fmaj7", but Tone.js needs
 * actual note names with octave numbers like ["C4", "Eb4", "G4", "Bb4"].
 *
 * This module bridges that gap using music theory:
 *   1. Parse the chord symbol into a root note and a quality
 *   2. Look up the interval pattern for that quality
 *   3. Apply the intervals to the root to get concrete note names
 */

/**
 * All 12 chromatic note names in order of ascending semitones.
 * Index 0 = C, index 1 = C#, ..., index 11 = B.
 * We use this as a circular lookup table: given a semitone offset,
 * (rootIndex + offset) % 12 gives us the resulting note name.
 */
const NOTE_NAMES = [
  "C", "C#", "D", "D#", "E", "F",
  "F#", "G", "G#", "A", "A#", "B",
];

/**
 * Enharmonic equivalents — maps flat note names to their sharp equivalents.
 *
 * Why? Our NOTE_NAMES array uses sharps, but the AI might return flats
 * (e.g. "Bb" instead of "A#", "Eb" instead of "D#"). We normalize to
 * sharps so we can do index lookups in NOTE_NAMES consistently.
 */
const ENHARMONIC_MAP: Record<string, string> = {
  Cb: "B",
  Db: "C#",
  Eb: "D#",
  Fb: "E",
  Gb: "F#",
  Ab: "G#",
  Bb: "A#",
};

/**
 * Interval patterns for common chord qualities.
 *
 * Each key is a chord quality suffix (what comes after the root note).
 * Each value is an array of semitone offsets from the root.
 *
 * Music theory recap:
 *   - A semitone is the smallest step in Western music (e.g. C to C#)
 *   - A major triad = root + major 3rd (4 semitones) + perfect 5th (7 semitones)
 *   - A minor triad = root + minor 3rd (3 semitones) + perfect 5th (7 semitones)
 *   - 7th chords add a 4th note on top of the triad
 *
 * The "" (empty string) entry handles bare chord names like "C" or "G"
 * which are implicitly major triads.
 */
const CHORD_INTERVALS: Record<string, number[]> = {
  "":      [0, 4, 7],         // major triad (default when no quality specified)
  maj:     [0, 4, 7],         // explicit major triad
  M:       [0, 4, 7],         // alternative major notation
  m:       [0, 3, 7],         // minor triad
  min:     [0, 3, 7],         // minor triad (long form)
  dim:     [0, 3, 6],         // diminished triad
  aug:     [0, 4, 8],         // augmented triad
  "7":     [0, 4, 7, 10],     // dominant 7th
  maj7:    [0, 4, 7, 11],     // major 7th
  M7:      [0, 4, 7, 11],     // major 7th (alternative)
  m7:      [0, 3, 7, 10],     // minor 7th
  min7:    [0, 3, 7, 10],     // minor 7th (long form)
  dim7:    [0, 3, 6, 9],      // diminished 7th (fully diminished)
  m7b5:    [0, 3, 6, 10],     // half-diminished 7th
  sus2:    [0, 2, 7],         // suspended 2nd (replaces 3rd with 2nd)
  sus4:    [0, 5, 7],         // suspended 4th (replaces 3rd with 4th)
  add9:    [0, 4, 7, 14],     // major triad + 9th
  "9":     [0, 4, 7, 10, 14], // dominant 9th
  m9:      [0, 3, 7, 10, 14], // minor 9th
  m11:     [0, 3, 7, 10, 14, 17], // minor 11th (simplified: root, m3, 5, b7, 9, 11)
  "7b9":   [0, 4, 7, 10, 13], // dominant 7 flat 9
  "maj7#11": [0, 4, 7, 11, 18], // major 7 sharp 11 (lydian)
  "6":     [0, 4, 7, 9],      // major 6th
  m6:      [0, 3, 7, 9],      // minor 6th
};

/**
 * Parses a chord symbol into its root note and quality suffix.
 *
 * Examples:
 *   "Cm7"   → { root: "C",  quality: "m7"  }
 *   "F#dim" → { root: "F#", quality: "dim" }
 *   "Bb"    → { root: "Bb", quality: ""    }
 *   "Abmaj7"→ { root: "Ab", quality: "maj7"}
 *
 * The regex breakdown:
 *   ^        — start of string
 *   ([A-G])  — capture group 1: the note letter (A through G)
 *   ([#b]?)  — capture group 2: optional sharp or flat
 *   (.*)     — capture group 3: everything else is the quality
 *   $        — end of string
 */
function parseChord(chordName: string): { root: string; quality: string } {
  const match = chordName.match(/^([A-G])([#b]?)(.*)$/);
  if (!match) {
    return { root: "C", quality: "" };
  }

  const root = match[1] + match[2]; // e.g. "F#" or "Bb" or "C"
  const quality = match[3];          // e.g. "m7" or "maj7" or ""

  return { root, quality };
}

/**
 * Normalizes a root note name to use sharps instead of flats.
 * This lets us do consistent index lookups in NOTE_NAMES.
 *
 * "Bb" → "A#", "Eb" → "D#", "C" → "C" (unchanged)
 */
function normalizeRoot(root: string): string {
  return ENHARMONIC_MAP[root] ?? root;
}

/**
 * chordToNotes(chordName, octave)
 *
 * The main exported function. Converts a chord symbol into an array of
 * note strings that Tone.js can play.
 *
 * @param chordName — A standard chord symbol like "Cm7", "Fmaj7", "G#dim"
 * @param octave    — The base octave for the voicing (default: 4, which is
 *                    middle-C territory — a nice, clear range for synth chords)
 * @returns Array of note strings like ["C4", "Eb4", "G4", "Bb4"]
 *
 * Example walkthrough for "Cm7" at octave 4:
 *   1. Parse: root = "C", quality = "m7"
 *   2. Normalize: "C" stays "C"
 *   3. Root index in NOTE_NAMES: 0
 *   4. Intervals for "m7": [0, 3, 7, 10]
 *   5. Apply each interval:
 *      - 0:  (0 + 0)  % 12 = 0  → "C"  + octave 4 → "C4"
 *      - 3:  (0 + 3)  % 12 = 3  → "D#" + octave 4 → "D#4"
 *      - 7:  (0 + 7)  % 12 = 7  → "G"  + octave 4 → "G4"
 *      - 10: (0 + 10) % 12 = 10 → "A#" + octave 4 → "A#4"
 *   6. Result: ["C4", "D#4", "G4", "A#4"]
 */
export function chordToNotes(chordName: string, octave: number = 4): string[] {
  const { root, quality } = parseChord(chordName.trim());
  const normalizedRoot = normalizeRoot(root);

  // Find the root's position in the chromatic scale (0–11)
  const rootIndex = NOTE_NAMES.indexOf(normalizedRoot);
  if (rootIndex === -1) {
    // Fallback: if we can't find the root, return a C major chord
    return [`C${octave}`, `E${octave}`, `G${octave}`];
  }

  // Look up the interval pattern for this chord quality.
  // If the quality isn't in our map, default to a major triad.
  const intervals = CHORD_INTERVALS[quality] ?? CHORD_INTERVALS[""];

  // Convert each interval to a concrete note name + octave.
  const notes: string[] = [];
  let currentOctave = octave;

  for (let i = 0; i < intervals.length; i++) {
    const semitones = intervals[i];

    // Calculate the absolute semitone position from the root
    const noteIndex = (rootIndex + semitones) % 12;

    // If this note is lower than the previous one in the chromatic scale,
    // it means we've wrapped around past B → C, so bump the octave up.
    // We compare absolute semitone positions to detect wrapping.
    if (i > 0) {
      const prevSemitones = intervals[i - 1];
      const prevNoteIndex = (rootIndex + prevSemitones) % 12;
      if (noteIndex <= prevNoteIndex) {
        currentOctave++;
      }
    }

    notes.push(`${NOTE_NAMES[noteIndex]}${currentOctave}`);
  }

  return notes;
}
