"use client";

/**
 * ExportButton — UI button that triggers MIDI file download.
 *
 * WHAT WE'RE DOING
 * ----------------
 * This component is a thin wrapper: when the user clicks "Export MIDI", we
 * call our midiExport utility with the current chord data, BPM, and octave.
 * All the real work (building the .mid file, triggering download) lives in
 * lib/midiExport.ts.
 *
 * WHY KEEP LOGIC IN lib/midiExport.ts (NOT HERE)
 * ----------------------------------------------
 * 1. Separation of concerns — React components handle rendering and user
 *    interaction; lib/ modules handle data transformation and side effects.
 * 2. Testability — We can unit test exportProgressionAsMidi() without
 *    rendering React or mocking the DOM.
 * 3. Reuse — If we ever add a "Export" menu or keyboard shortcut, we call
 *    the same function; we don't duplicate MIDI-building code.
 *
 * PROPS
 * -----
 * We need the same three values the export function needs: chordData (for
 * progression + scale), bpm (for tempo in the file), octave (for note range).
 * The parent (page.tsx) already has these in state, so it just passes them down.
 */

import { Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ChordData } from "@/types/chord";
import { exportProgressionAsMidi } from "@/lib/midiExport";

interface ExportButtonProps {
  /** Current chord progression and scale (used for notes + filename) */
  chordData: ChordData;
  /** Current BPM (written into the MIDI file so DAW playback matches the app) */
  bpm: number;
  /** Octave used for chord voicing (same as playback so export matches what they heard) */
  octave: number;
}

export default function ExportButton({
  chordData,
  bpm,
  octave,
}: ExportButtonProps) {
  return (
    <Button
      variant="outline"
      size="icon"
      className="shrink-0"
      onClick={() => exportProgressionAsMidi(chordData, bpm, octave)}
      aria-label="Export MIDI"
      title="Export MIDI"
    >
      <Download className="size-4" aria-hidden />
    </Button>
  );
}
