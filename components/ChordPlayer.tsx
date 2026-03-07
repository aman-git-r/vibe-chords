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
 * 3. REFS VS STATE: We store the Tone.js sampler and scheduled event ID in
 *    `useRef` instead of `useState`. Why? Because changing a ref does NOT
 *    trigger a re-render. The sampler is a long-lived object that persists
 *    across renders — we don't want React to re-create it every time
 *    something else in the component updates.
 *
 * 4. CLEANUP: When the component unmounts or the chord data changes, we must
 *    stop the transport, dispose the sampler, and cancel scheduled events.
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

/** CDN base URL for Salamander Grand Piano samples (Tone.js examples). */
const PIANO_SAMPLES_CDN = "https://tonejs.github.io/audio/salamander/";
const PIANO_URLS: Record<string, string> = {
  A0: "A0.mp3",
  C1: "C1.mp3",
  "D#1": "Ds1.mp3",
  "F#1": "Fs1.mp3",
  A1: "A1.mp3",
  C2: "C2.mp3",
  "D#2": "Ds2.mp3",
  "F#2": "Fs2.mp3",
  A2: "A2.mp3",
  C3: "C3.mp3",
  "D#3": "Ds3.mp3",
  "F#3": "Fs3.mp3",
  A3: "A3.mp3",
  C4: "C4.mp3",
  "D#4": "Ds4.mp3",
  "F#4": "Fs4.mp3",
  A4: "A4.mp3",
  C5: "C5.mp3",
  "D#5": "Ds5.mp3",
  "F#5": "Fs5.mp3",
  A5: "A5.mp3",
  C6: "C6.mp3",
  "D#6": "Ds6.mp3",
  "F#6": "Fs6.mp3",
  A6: "A6.mp3",
  C7: "C7.mp3",
  "D#7": "Ds7.mp3",
  "F#7": "Fs7.mp3",
  A7: "A7.mp3",
  C8: "C8.mp3",
};

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
   *   - samplerRef: the Tone.Sampler instance (piano samples, created once)
   *   - eventIdRef: the ID of the scheduled repeating event (for cleanup)
   *   - chordIndexRef: tracks which chord we're on during playback
   */
  const toneRef = useRef<ToneModule>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const samplerRef = useRef<any>(null);
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

    // If we have a sampler, release all held notes and destroy it
    if (samplerRef.current) {
      samplerRef.current.releaseAll();
      samplerRef.current.dispose();
      samplerRef.current = null;
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
   *   3. Create reverb and Tone.Sampler with piano samples from CDN
   *   4. In sampler onload: connect to reverb, set BPM, schedule beats, start Transport
   */
  const startPlayback = useCallback(async () => {
    // Step 1: Dynamic import — loads Tone.js only in the browser
    if (!toneRef.current) {
      toneRef.current = await import("tone");
    }
    const Tone = toneRef.current;

    // Step 2: Unlock AudioContext (required by browser autoplay policy).
    await Tone.start();

    // Clean up any previous playback before starting fresh
    cleanup();

    const reverb = new Tone.Reverb({ decay: 2, wet: 0.35 }).toDestination();
    reverbRef.current = reverb;

    // Step 3: Realistic piano via Tone.Sampler (Salamander Grand Piano from CDN).
    // Assign to ref immediately so cleanup can dispose it even if onload hasn't run.
    const sampler = new Tone.Sampler({
      urls: PIANO_URLS,
      baseUrl: PIANO_SAMPLES_CDN,
      release: 1,
      onload: () => {
        // Don't start if user already paused or component unmounted (cleanup set ref to null)
        if (samplerRef.current !== sampler) return;
        sampler.connect(reverb);

        const transport = Tone.getTransport();
        transport.bpm.value = bpm;

        const chordNotes = chordData.progression.map((chord) =>
          chordToNotes(chord, octave)
        );

        chordIndexRef.current = 0;

        const eventId = transport.scheduleRepeat(
          (time: number) => {
            const idx = chordIndexRef.current;
            const notes = chordNotes[idx];

            setTimeout(() => onChordChange(idx), 0);

            sampler.triggerAttackRelease(notes, "1n", time);

            chordIndexRef.current = (idx + 1) % chordData.progression.length;
          },
          "1n"
        );

        eventIdRef.current = eventId;
        transport.start();
      },
    });
    samplerRef.current = sampler;
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
    <div className="flex items-center gap-3 flex-wrap">
      <Button
        onClick={onPlayToggle}
        variant="default"
        size="icon"
        className="rounded-lg"
        aria-label={isPlaying ? "Pause" : "Play"}
        title={isPlaying ? "Pause" : "Play"}
      >
        {isPlaying ? (
          <Pause className="size-5" aria-hidden />
        ) : (
          <Play className="size-5" aria-hidden />
        )}
      </Button>

      <div className="flex min-w-80 max-w-80 flex-1 items-center gap-2">
        <Label htmlFor="bpm-slider" className="w-8 shrink-0 text-muted-foreground text-xs">
          BPM
        </Label>
        <Slider
          id="bpm-slider"
          min={60}
          max={180}
          value={[bpm]}
          onValueChange={(v) => onBpmChange(v[0] ?? bpm)}
          className="flex-1 w-full"
        />
        <span className="w-8 shrink-0 text-right text-sm font-mono text-muted-foreground tabular-nums">
          {bpm}
        </span>
      </div>
      {onOctaveChange && (
        <div className="flex items-center gap-2">
          <Label className="text-muted-foreground shrink-0 text-xs">Octave</Label>
          <div className="flex items-center rounded-md border border-input bg-muted/30">
            <button
              type="button"
              onClick={() => onOctaveChange(Math.max(OCTAVE_MIN, octave - 1))}
              disabled={octave <= OCTAVE_MIN}
              className="inline-flex size-8 items-center justify-center rounded-l-md text-muted-foreground hover:bg-muted hover:text-foreground cursor-pointer disabled:pointer-events-none disabled:opacity-50"
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
              className="inline-flex size-8 items-center justify-center rounded-r-md text-muted-foreground hover:bg-muted hover:text-foreground cursor-pointer disabled:pointer-events-none disabled:opacity-50"
              aria-label="Raise octave"
            >
              <ChevronUp className="size-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
