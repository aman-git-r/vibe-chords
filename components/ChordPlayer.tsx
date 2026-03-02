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
  /** Whether audio is currently playing */
  isPlaying: boolean;
  /** Called when user clicks Play or Pause */
  onPlayToggle: () => void;
  /** Called on each beat with the index of the chord now playing */
  onChordChange: (index: number) => void;
}

export default function ChordPlayer({
  chordData,
  bpm,
  onBpmChange,
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

    // Step 3: Create a PolySynth — a synthesizer that can play multiple
    // notes at the same time (essential for chords).
    // We use 8 voices because our chords can have up to 8 notes.
    // The Synth base gives a clean, simple tone.
    const synth = new Tone.PolySynth(Tone.Synth, {
      maxPolyphony: 8,
      voice: Tone.Synth,
      options: {
        oscillator: { type: "sawtooth" },  // warm, mellow tone (good for chords)
        envelope: {
          attack: 0.05,    // how quickly the note reaches full volume (50ms = snappy)
          decay: 0.3,      // how quickly it drops to sustain level
          sustain: 0.4,    // volume level while key is held (40% of peak)
          release: 0.8,    // how long the note fades after release (800ms = smooth tail)
        },
      },
    }).toDestination(); // .toDestination() connects the synth to the speakers

    synthRef.current = synth;

    // Step 4: Set the BPM on the Transport (Tone.js's master clock)
    const transport = Tone.getTransport();
    transport.bpm.value = bpm;

    // Pre-compute the notes for each chord in the progression.
    // We do this once here rather than on every beat for performance.
    const chordNotes = chordData.progression.map((chord) => chordToNotes(chord));

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
        synth.triggerAttackRelease(notes, "4n", time);

        // Advance to the next chord, looping back to the start
        chordIndexRef.current = (idx + 1) % chordData.progression.length;
      },
      "4n" // repeat interval: every quarter note (one beat)
    );

    eventIdRef.current = eventId;

    // Step 6: Start the Transport — this kicks off the scheduled events
    transport.start();
  }, [bpm, chordData, cleanup, onChordChange]);

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
      {/* Play/Pause button */}
      <button
        onClick={onPlayToggle}
        className="flex items-center justify-center gap-2 rounded-xl bg-zinc-800 border border-zinc-700 px-6 py-3
                   font-semibold text-zinc-100 transition-all hover:bg-zinc-700 active:scale-[0.97]"
      >
        {isPlaying ? (
          <>
            {/* Pause icon — two vertical bars */}
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="h-5 w-5">
              <path fillRule="evenodd" d="M6.75 5.25a.75.75 0 0 1 .75-.75H9a.75.75 0 0 1 .75.75v13.5a.75.75 0 0 1-.75.75H7.5a.75.75 0 0 1-.75-.75V5.25Zm7.5 0A.75.75 0 0 1 15 4.5h1.5a.75.75 0 0 1 .75.75v13.5a.75.75 0 0 1-.75.75H15a.75.75 0 0 1-.75-.75V5.25Z" clipRule="evenodd" />
            </svg>
            Pause
          </>
        ) : (
          <>
            {/* Play icon — triangle pointing right */}
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="h-5 w-5">
              <path fillRule="evenodd" d="M4.5 5.653c0-1.427 1.529-2.33 2.779-1.643l11.54 6.347c1.295.712 1.295 2.573 0 3.286L7.28 19.99c-1.25.687-2.779-.217-2.779-1.643V5.653Z" clipRule="evenodd" />
            </svg>
            Play
          </>
        )}
      </button>

      {/* BPM slider with label and numeric display */}
      <div className="flex flex-1 items-center gap-3 sm:ml-4">
        <label htmlFor="bpm-slider" className="text-sm font-medium text-zinc-400 whitespace-nowrap">
          BPM
        </label>
        <input
          id="bpm-slider"
          type="range"
          min={60}
          max={180}
          value={bpm}
          onChange={(e) => onBpmChange(Number(e.target.value))}
          className="h-2 flex-1 cursor-pointer appearance-none rounded-full bg-zinc-700
                     accent-purple-500 [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:w-4
                     [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:rounded-full
                     [&::-webkit-slider-thumb]:bg-purple-500"
        />
        {/* Numeric BPM display — fixed width so it doesn't jump as numbers change */}
        <span className="w-10 text-right text-sm font-mono text-zinc-300">
          {bpm}
        </span>
      </div>
    </div>
  );
}
