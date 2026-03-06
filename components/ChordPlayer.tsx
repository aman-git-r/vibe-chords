"use client";

/**
 * ChordPlayer — the audio engine and playback controls for VibeChords.
 *
 * This is the most complex component in the app. It wraps Tone.js to provide:
 *   - Play/Pause toggle button
 *   - BPM slider (60–180 range)
 *   - Real-time chord highlighting via onChordChange callback
 *
 * Key technical challenges this component solves:
 *
 * 1. DYNAMIC IMPORT: Tone.js accesses `window` and `AudioContext`, which don't
 *    exist on the server. Next.js renders components on the server first (SSR),
 *    so we can't `import Tone from "tone"` at the top level — that would crash.
 *    Instead, we use `await import("tone")` inside an async function that only
 *    runs in the browser.
 *
 * 2. AUTOPLAY POLICY: Modern browsers block audio until the user interacts with
 *    the page (clicks, taps, etc.). Tone.js provides `Tone.start()` which must
 *    be called from within a user-triggered event handler (like our Play button
 *    click). This "unlocks" the AudioContext.
 *
 * 3. REFS VS STATE: We store the Tone.js synth and scheduled event ID in
 *    `useRef` instead of `useState`. Why? Because changing a ref does NOT
 *    trigger a re-render. The synth is a long-lived object that persists
 *    across renders — we don't want React to re-create it every time
 *    something else in the component updates.
 *
 * 4. CLEANUP: When the component unmounts or the chord data changes, we must
 *    stop the transport, dispose the synth, and cancel scheduled events.
 *    Otherwise we'd get ghost audio playing in the background.
 */

import { useRef, useEffect, useCallback } from "react";
import { ChordData } from "@/types/chord";
import { chordToNotes } from "@/lib/chordToNotes";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Play, Pause, ChevronDown, ChevronUp } from "lucide-react";

// We store a reference to the Tone module after dynamic import.
// Using `any` here because the Tone module's type is complex and
// we're importing it dynamically — TypeScript can't infer the type
// of a dynamic import target at the call site.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type ToneModule = any;

interface ChordPlayerProps {
  /** The full chord data from the AI (we use progression for playback) */
  chordData: ChordData;
  /** Current BPM value (controlled by parent) */
  bpm: number;
  /** Called when user drags the BPM slider */
  onBpmChange: (bpm: number) => void;
  /** Base octave for chord playback (3–6). Higher = brighter. */
  octave?: number;
  /** Called when user changes octave */
  onOctaveChange?: (octave: number) => void;
  /** Whether audio is currently playing */
  isPlaying: boolean;
  /** Called when user clicks Play or Pause */
  onPlayToggle: () => void;
  /** Called on each beat with the index of the chord now playing */
  onChordChange: (index: number) => void;
}

const OCTAVE_MIN = 2;
const OCTAVE_MAX = 6;

export default function ChordPlayer({
  chordData,
  bpm,
  onBpmChange,
  octave = 3,
  onOctaveChange,
  isPlaying,
  onPlayToggle,
  onChordChange,
}: ChordPlayerProps) {
  /**
   * useRef stores mutable values that persist across renders without
   * triggering re-renders when they change. Perfect for:
   *   - toneRef: the dynamically imported Tone module
   *   - synthRef: the PolySynth instance (created once, reused)
   *   - eventIdRef: the ID of the scheduled repeating event (for cleanup)
   *   - chordIndexRef: tracks which chord we're on during playback
   */
  const toneRef = useRef<ToneModule>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const synthRef = useRef<any>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const reverbRef = useRef<any>(null);
  const eventIdRef = useRef<number | null>(null);
  const chordIndexRef = useRef(0);

  /**
   * cleanup() — stops all audio and releases resources.
   *
   * Called when:
   *   - User presses Pause
   *   - New chord data arrives (need to restart with new chords)
   *   - Component unmounts (user navigates away)
   *
   * We must be thorough here to prevent "ghost audio" — sounds that
   * keep playing even after the user thinks they stopped.
   */
  const cleanup = useCallback(() => {
    const Tone = toneRef.current;
    if (!Tone) return;

    // Stop the master clock — halts all scheduled events
    Tone.getTransport().stop();
    Tone.getTransport().cancel();

    // If we have a synth, release all held notes and destroy it
    if (synthRef.current) {
      synthRef.current.releaseAll();
      synthRef.current.dispose();
      synthRef.current = null;
    }
    if (reverbRef.current) {
      reverbRef.current.dispose();
      reverbRef.current = null;
    }

    eventIdRef.current = null;
    chordIndexRef.current = 0;
  }, []);

  /**
   * startPlayback() — initializes Tone.js and begins playing the progression.
   *
   * This is an async function because:
   *   1. We dynamically import Tone.js (returns a Promise)
   *   2. Tone.start() returns a Promise (AudioContext activation)
   *
   * Flow:
   *   1. Dynamically import Tone.js (only first time — cached after)
   *   2. Call Tone.start() to unlock the AudioContext (browser autoplay policy)
   *   3. Create a PolySynth with 8 voices (enough for any chord up to 8 notes)
   *   4. Set the Transport BPM
   *   5. Schedule a repeating event: every beat, play the next chord
   *   6. Start the Transport
   */
  const startPlayback = useCallback(async () => {
    // Step 1: Dynamic import — loads Tone.js only in the browser
    if (!toneRef.current) {
      toneRef.current = await import("tone");
    }
    const Tone = toneRef.current;

    // Step 2: Unlock AudioContext (required by browser autoplay policy).
    // This must happen inside a user-gesture handler (click), which it is —
    // the user clicked Play, which called onPlayToggle, which set isPlaying,
    // which triggered this effect.
    await Tone.start();

    // Clean up any previous playback before starting fresh
    cleanup();

    // Step 3: Piano-like PolySynth — percussive envelope (short attack, decay-heavy)
    // and triangle wave for a warmer, piano-like tone. Run through reverb.
    const synth = new Tone.PolySynth(Tone.Synth, {
      maxPolyphony: 8,
      voice: Tone.Synth,
      options: {
        oscillator: { type: "triangle" },
        envelope: {
          attack: 0.02,   // very fast attack (piano hammer hit)
          decay: 0.4,     // quick decay to sustain
          sustain: 0.25,  // low sustain (note fades like a piano)
          release: 0.6,   // moderate release tail
        },
      },
    });

    const reverb = new Tone.Reverb({ decay: 2, wet: 0.35 }).toDestination();
    synth.connect(reverb);

    synthRef.current = synth;
    reverbRef.current = reverb;

    // Step 4: Set the BPM on the Transport (Tone.js's master clock)
    const transport = Tone.getTransport();
    transport.bpm.value = bpm;

    // Pre-compute the notes for each chord in the progression.
    // We do this once here rather than on every beat for performance.
    const chordNotes = chordData.progression.map((chord) =>
      chordToNotes(chord, octave)
    );

    // Step 5: Schedule a repeating event on every quarter note ("4n").
    // The callback fires on each beat. Inside it, we:
    //   a. Determine which chord to play (cycling through the progression)
    //   b. Tell the parent which chord is active (for card highlighting)
    //   c. Play the notes using triggerAttackRelease
    chordIndexRef.current = 0;

    const eventId = transport.scheduleRepeat(
      (time: number) => {
        const idx = chordIndexRef.current;
        const notes = chordNotes[idx];

        // Notify the parent so it can highlight the active ChordCard.
        // We use setTimeout(..., 0) to defer the state update out of the
        // audio callback — Tone.js callbacks run in the audio thread and
        // shouldn't do heavy work. React state updates are deferred safely.
        setTimeout(() => onChordChange(idx), 0);

        // triggerAttackRelease(notes, duration, time):
        //   - notes: array of note strings to play simultaneously
        //   - "4n": quarter note duration (one beat at current BPM)
        //   - time: the exact audio-thread time to start (from callback arg)
        synth.triggerAttackRelease(notes, "2n", time);

        // Advance to the next chord, looping back to the start
        chordIndexRef.current = (idx + 1) % chordData.progression.length;
      },
      "2n" // repeat interval: every quarter note (one beat)
    );

    eventIdRef.current = eventId;

    // Step 6: Start the Transport — this kicks off the scheduled events
    transport.start();
  }, [bpm, chordData, octave, cleanup, onChordChange]);

  /**
   * Effect: react to isPlaying changes.
   *
   * When isPlaying becomes true → start playback.
   * When isPlaying becomes false → stop and clean up.
   *
   * We also clean up when the component unmounts (the return function).
   */
  useEffect(() => {
    if (isPlaying) {
      startPlayback();
    } else {
      cleanup();
      onChordChange(-1); // -1 = no chord is active
    }

    return () => {
      cleanup();
    };
  }, [isPlaying]); // eslint-disable-line react-hooks/exhaustive-deps

  /**
   * Effect: sync BPM changes to the Tone.js Transport in real time.
   *
   * When the user drags the BPM slider, the parent updates `bpm` state,
   * which flows down as a prop. This effect picks up the change and
   * updates Tone.js's Transport BPM. The change takes effect immediately —
   * the next beat will fire at the new tempo.
   */
  useEffect(() => {
    if (toneRef.current && isPlaying) {
      toneRef.current.getTransport().bpm.value = bpm;
    }
  }, [bpm, isPlaying]);

  /**
   * Effect: when chord data changes (user generates a new progression),
   * stop any current playback. The user will need to press Play again
   * for the new chords — this prevents jarring audio transitions.
   */
  useEffect(() => {
    if (isPlaying) {
      onPlayToggle(); // this sets isPlaying to false in parent
    }
    cleanup();
  }, [chordData]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
      <Button
        onClick={onPlayToggle}
        variant="default"
        size="lg"
        className="gap-2 rounded-lg font-semibold"
      >
        {isPlaying ? (
          <>
            <Pause className="size-5" aria-hidden />
            Pause
          </>
        ) : (
          <>
            <Play className="size-5" aria-hidden />
            Play
          </>
        )}
      </Button>

      <div className="flex flex-1 flex-wrap items-center gap-3 sm:ml-4">
        <div className="flex flex-1 items-center gap-3 min-w-0">
          <Label htmlFor="bpm-slider" className="w-10 shrink-0 text-muted-foreground">
            BPM
          </Label>
          <Slider
            id="bpm-slider"
            min={60}
            max={180}
            value={[bpm]}
            onValueChange={(v) => onBpmChange(v[0] ?? bpm)}
            className="flex-1"
          />
          <span className="w-10 text-right text-sm font-mono text-muted-foreground">
            {bpm}
          </span>
        </div>
        {onOctaveChange && (
          <div className="flex items-center gap-2">
            <Label className="text-muted-foreground shrink-0">Octave</Label>
            <div className="flex items-center rounded-md border border-input bg-muted/30">
              <button
                type="button"
                onClick={() => onOctaveChange(Math.max(OCTAVE_MIN, octave - 1))}
                disabled={octave <= OCTAVE_MIN}
                className="inline-flex size-8 items-center justify-center rounded-l-md text-muted-foreground hover:bg-muted hover:text-foreground disabled:pointer-events-none disabled:opacity-50"
                aria-label="Lower octave"
              >
                <ChevronDown className="size-4" />
              </button>
              <span className="min-w-8 text-center text-sm font-mono tabular-nums">
                {octave}
              </span>
              <button
                type="button"
                onClick={() => onOctaveChange(Math.min(OCTAVE_MAX, octave + 1))}
                disabled={octave >= OCTAVE_MAX}
                className="inline-flex size-8 items-center justify-center rounded-r-md text-muted-foreground hover:bg-muted hover:text-foreground disabled:pointer-events-none disabled:opacity-50"
                aria-label="Raise octave"
              >
                <ChevronUp className="size-4" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
