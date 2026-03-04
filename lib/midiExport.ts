/**
 * midiExport.ts — Converts a chord progression into a downloadable .mid file.
 *
 * WHAT WE'RE DOING
 * ----------------
 * MIDI (Musical Instrument Digital Interface) is a standard that describes
 * *instructions* for music: "play note C4 at time 0 for 2 beats at velocity 80."
 * It does NOT contain actual audio — the DAW (FL Studio, Ableton, etc.) uses
 * these instructions to trigger whatever instrument the user has loaded.
 *
 * So our job is to take ChordData (chord names like "Cm7", "Fmaj7") and turn
 * it into a sequence of MIDI note events, then package that into a .mid file
 * and trigger a browser download.
 *
 * HOW WE DO IT
 * ------------
 * 1. Use our existing chordToNotes() to convert each chord symbol into
 *    note names (e.g. "Cm7" → ["C4", "D#4", "G4", "A#4"]).
 * 2. Use the midi-writer-js library to create a MIDI "track" and add
 *    one "note event" per chord (all notes in the chord play at once).
 * 3. Set the track tempo to the user's current BPM.
 * 4. Build the binary .mid file and trigger download via a temporary <a> link.
 *
 * WHY CLIENT-SIDE
 * ---------------
 * The entire conversion happens in the browser. We don't send chord data to
 * the server — the user's progression never leaves their machine. This
 * keeps the flow simple and avoids extra API surface.
 */

import MidiWriter from "midi-writer-js";
import { ChordData } from "@/types/chord";
import { chordToNotes } from "@/lib/chordToNotes";

/**
 * exportProgressionAsMidi — converts ChordData into a .mid file and downloads it.
 *
 * @param chordData — The full AI response: progression array, scale, mode, etc.
 *                    We use chordData.progression (the chord names) and
 *                    chordData.scale (for a nice filename).
 * @param bpm       — Current tempo. The exported MIDI file will use this so
 *                    when the user opens it in a DAW, playback matches our app.
 * @param octave    — Same octave we use for Tone.js playback. Exporting at the
 *                    same octave keeps the DAW preview in a familiar range.
 *
 * Side effect: triggers a browser download. Does not return anything.
 */
export function exportProgressionAsMidi(
  chordData: ChordData,
  bpm: number,
  octave: number
): void {
  // ── Step 1: Create a MIDI track ─────────────────────────────────────
  // A MIDI file can have multiple tracks (e.g. drums, bass, chords). We only
  // need one track for our chord progression. The Track object holds all
  // note events and meta events (like tempo).
  const track = new MidiWriter.Track();

  // ── Step 2: Set the tempo (BPM) ─────────────────────────────────────
  // This writes a "tempo meta event" into the track. When a DAW opens the
  // file, it reads this and sets the project tempo. Without it, the DAW
  // would use its default (often 120 BPM) and our chords would play at the
  // wrong speed.
  track.setTempo(bpm);

  // ── Step 3: Add one note event per chord ─────────────────────────────
  // We loop over each chord in the progression. For each chord we:
  //   a) Convert the symbol to note names using our existing chordToNotes()
  //   b) Create a NoteEvent that plays all those notes at once (a chord)
  //   c) Add the event to the track (order matters — they play left to right)
  for (const chord of chordData.progression) {
    // chordToNotes("Cm7", 4) → ["C4", "D#4", "G4", "A#4"]
    // We reuse the same logic Tone.js uses so the exported file matches
    // what the user heard in the browser.
    const notes = chordToNotes(chord, octave);

    // NoteEvent options:
    //   pitch    — Array of note names. midi-writer-js accepts "C4", "D#4", etc.
    //              When you pass an array, it plays all notes at once (a chord).
    //   duration — "2" = half note (same length as our Tone.js "2n" playback).
    //              Other values: "1"=whole, "4"=quarter, "8"=eighth.
    //   velocity — How hard the "key" is pressed, 0–127. 80 = moderately loud.
    //              The DAW will use this for dynamics; 80 is a safe default.
    const noteEvent = new MidiWriter.NoteEvent({
      pitch: notes,
      duration: "2",
      velocity: 80,
    });
    track.addEvent(noteEvent);
  }

  // ── Step 4: Build the MIDI file from the track ────────────────────────
  // Writer takes an array of tracks and produces the binary .mid format.
  // We only have one track, so we pass [track].
  const writer = new MidiWriter.Writer([track]);

  // ── Step 5: Trigger the browser download ─────────────────────────────
  // dataUri() returns a string like "data:audio/midi;base64,TVq..." that
  // contains the entire file encoded in base64. We can use this as the
  // href of an <a> tag. When the user "clicks" it (we do it programmatically),
  // the browser offers to download the file. The download attribute sets
  // the suggested filename.
  //
  // Why createElement + appendChild + click + removeChild?
  // This is the standard way to trigger a download in JavaScript without
  // navigating away or opening a new tab. We create the link, add it to
  // the DOM (required for click() to work in some browsers), click it,
  // then remove it so we don't leave stray elements in the DOM.
  const dataUri = writer.dataUri();
  const link = document.createElement("a");
  link.href = dataUri;
  // Filename: vibechords-C-Minor.mid (replace spaces in scale with dashes)
  link.download = `vibechords-${chordData.scale.replace(/\s+/g, "-")}.mid`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}
