/**
 * ChordData — the core data shape returned by the Gemini AI.
 *
 * This interface is the single source of truth for what the AI returns
 * and what the frontend consumes. Every layer of the app imports it:
 *   - lib/gemini.ts validates raw AI output against it
 *   - app/api/generate/route.ts returns it as the HTTP response body
 *   - (Week 2) frontend components use it to render chord cards and playback
 *
 * Each field maps directly to a UI element:
 *   - progression → chord cards displayed on screen + notes fed to Tone.js
 *   - bpm         → tempo slider default value (we pick the midpoint of the range)
 *   - scale/mode  → label shown above the chords (e.g. "C Minor — Aeolian")
 *   - mood_tags   → small pill/badge chips to confirm the AI understood the vibe
 *   - explanation  → short paragraph shown below the chords
 */
export interface ChordData {
  progression: string[];   // 4–8 chord names like "Cm", "Fmaj7", "G#dim"
  bpm: [number, number];   // [min, max] suggested BPM range, e.g. [140, 160]
  scale: string;           // root + scale type, e.g. "C Minor"
  mode: string;            // modal name, e.g. "Aeolian", "Dorian"
  mood_tags: string[];     // 3–5 single descriptive words
  explanation: string;     // 1–2 sentence explanation of why these chords fit the vibe
}
