"use client";

/**
 * page.tsx — The main (and only) page of VibeChords.
 *
 * This is the root page served at "/". It orchestrates all the components
 * and manages the shared application state using React's useState hook.
 *
 * Why "use client"?
 * -----------------
 * Next.js App Router defaults to Server Components (rendered on the server,
 * sent as HTML). But this page needs:
 *   - useState (interactive state management)
 *   - Event handlers (onClick, onChange)
 *   - Browser APIs (fetch for the API call, Tone.js for audio)
 * These are all client-side features, so we opt in with "use client".
 *
 * State management approach:
 * --------------------------
 * All state lives here in the page component and is passed down to children
 * as props. This is called "lifting state up" — the parent owns the data and
 * children are controlled by it. This pattern makes data flow predictable:
 * data flows DOWN via props, events flow UP via callbacks.
 *
 * We could use a state management library (Redux, Zustand), but for an app
 * this size, plain useState is simpler and perfectly adequate.
 */

import { useState } from "react";
import { ChordData } from "@/types/chord";
import VibeInput from "@/components/VibeInput";
import ChordCard from "@/components/ChordCard";
import ChordPlayer from "@/components/ChordPlayer";

export default function Home() {
  // ── Application State ──────────────────────────────────────────────
  // Each piece of state corresponds to a part of the UI:

  /** The AI's response — null until the user generates their first progression */
  const [chordData, setChordData] = useState<ChordData | null>(null);

  /** True while we're waiting for the /api/generate response */
  const [isLoading, setIsLoading] = useState(false);

  /** Error message to display, or null if everything is fine */
  const [error, setError] = useState<string | null>(null);

  /** Current playback tempo — initialized from the AI's suggestion (midpoint of range) */
  const [bpm, setBpm] = useState(120);

  /** Whether the chord progression is currently being played through Tone.js */
  const [isPlaying, setIsPlaying] = useState(false);

  /**
   * Which chord card is highlighted during playback.
   * -1 means no chord is active (not playing).
   * 0, 1, 2... corresponds to the index in chordData.progression.
   */
  const [activeChordIndex, setActiveChordIndex] = useState(-1);

  /**
   * handleGenerate — called when the user submits a vibe description.
   *
   * This is the main action in the app. It:
   *   1. Stops any current playback (so old chords don't keep playing)
   *   2. Sets loading state (shows spinner, disables input)
   *   3. Calls our backend API with the vibe text
   *   4. Parses the response and updates state
   *   5. Initializes the BPM to the midpoint of the AI's suggested range
   *
   * Error handling:
   *   - If the API returns an error JSON, we extract the message
   *   - If the fetch itself fails (network error), we catch and show a generic message
   *   - Either way, we clear loading state so the user can try again
   */
  const handleGenerate = async (vibe: string) => {
    // Stop current playback before generating new chords
    setIsPlaying(false);
    setActiveChordIndex(-1);

    setIsLoading(true);
    setError(null);

    try {
      // Call our Next.js API route. The request goes from the browser to
      // the same Next.js server, which then calls Gemini. This keeps the
      // API key secret (it never reaches the browser).
      const response = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ vibe }),
      });

      const data = await response.json();

      if (!response.ok) {
        // API returned an error (400, 429, 500, etc.)
        // The error message is in data.error (set by our route handler)
        setError(data.error || "Something went wrong. Please try again.");
        return;
      }

      // Success! Store the chord data and set BPM to the midpoint
      // of the AI's suggested range. Math.round ensures we get a
      // clean integer (e.g. [140, 160] → 150).
      setChordData(data);
      setBpm(Math.round((data.bpm[0] + data.bpm[1]) / 2));
    } catch {
      // Network error, JSON parse error, or other unexpected failure
      setError("Failed to connect. Check your internet and try again.");
    } finally {
      // Always clear loading state, whether we succeeded or failed
      setIsLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen flex-col items-center bg-zinc-950 px-4 py-12 font-sans text-zinc-100">
      <main className="w-full max-w-2xl space-y-8">
        {/* ── Header ───────────────────────────────────────────── */}
        <header className="text-center space-y-2">
          <h1 className="text-4xl font-bold tracking-tight bg-linear-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent">
            VibeChords
          </h1>
          <p className="text-sm text-zinc-500">
            Describe a vibe. Get a chord progression. Hear it play.
          </p>
        </header>

        {/* ── Vibe Input Section ───────────────────────────────── */}
        <VibeInput onGenerate={handleGenerate} isLoading={isLoading} />

        {/* ── Error Banner ─────────────────────────────────────── */}
        {/* Only rendered when there's an error to show */}
        {error && (
          <div className="rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-300">
            {error}
          </div>
        )}

        {/* ── Results Section ──────────────────────────────────── */}
        {/* Only rendered after we have chord data from the AI */}
        {chordData && (
          <div className="space-y-6">
            {/* Scale and mode label */}
            <div className="text-center space-y-2">
              <p className="text-lg font-semibold text-zinc-200">
                {chordData.scale}
                <span className="text-zinc-500"> — </span>
                <span className="text-zinc-400">{chordData.mode}</span>
              </p>

              {/* Mood tags — rendered as small pill badges */}
              {chordData.mood_tags.length > 0 && (
                <div className="flex flex-wrap justify-center gap-2">
                  {chordData.mood_tags.map((tag) => (
                    <span
                      key={tag}
                      className="rounded-full bg-purple-500/15 border border-purple-500/30 px-3 py-0.5 text-xs font-medium text-purple-300"
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              )}
            </div>

            {/* Chord cards — one per chord in the progression */}
            <div className="flex flex-wrap justify-center gap-3">
              {chordData.progression.map((chord, i) => (
                <ChordCard
                  key={`${chord}-${i}`}
                  chord={chord}
                  index={i}
                  isActive={i === activeChordIndex}
                />
              ))}
            </div>

            {/* AI explanation text */}
            {chordData.explanation && (
              <p className="text-center text-sm text-zinc-500 italic max-w-lg mx-auto">
                {chordData.explanation}
              </p>
            )}

            {/* Playback controls — play/pause button + BPM slider */}
            <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-4">
              <ChordPlayer
                chordData={chordData}
                bpm={bpm}
                onBpmChange={setBpm}
                isPlaying={isPlaying}
                onPlayToggle={() => setIsPlaying((prev) => !prev)}
                onChordChange={setActiveChordIndex}
              />
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
