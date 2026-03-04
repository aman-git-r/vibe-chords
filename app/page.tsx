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
import ExportButton from "@/components/ExportButton";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { SAMPLE_CHORDS } from "@/lib/sampleChords";
import { Loader2, Sparkles } from "lucide-react";

export default function Home() {
  // ── Application State ──────────────────────────────────────────────
  // Each piece of state corresponds to a part of the UI:

  /** The AI's response — null until the user generates their first progression */
  const [chordData, setChordData] = useState<ChordData | null>(null);

  /** True while we're waiting for the /api/generate response */
  const [isLoading, setIsLoading] = useState(false);

  /** True while we're waiting for the /api/vary response (so Vary button can show "Varying...") */
  const [isVariationLoading, setIsVariationLoading] = useState(false);

  /** Error message to display, or null if everything is fine */
  const [error, setError] = useState<string | null>(null);

  /** Current playback tempo — initialized from the AI's suggestion (midpoint of range) */
  const [bpm, setBpm] = useState(120);

  /** Whether the chord progression is currently being played through Tone.js */
  const [isPlaying, setIsPlaying] = useState(false);

  /** Base octave for chord playback (3–6). Higher = brighter. */
  const [octave, setOctave] = useState(3);

  /**
   * Which chord card is highlighted during playback.
   * -1 means no chord is active (not playing).
   * 0, 1, 2... corresponds to the index in chordData.progression.
   */
  const [activeChordIndex, setActiveChordIndex] = useState(-1);

  /**
   * Optional hint for the "Vary" action — e.g. "darker", "jazzier", "more minimal".
   * When empty, we ask the AI for "a creative variation" with no direction.
   */
  const [variationHint, setVariationHint] = useState("");

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
  /** Load a sample progression without calling the API (no Gemini quota used). */
  const handleTrySample = (sample: ChordData) => {
    setIsPlaying(false);
    setActiveChordIndex(-1);
    setError(null);
    setChordData(sample);
    setBpm(Math.round((sample.bpm[0] + sample.bpm[1]) / 2));
  };

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

  /**
   * handleVariation — called when the user clicks "Vary" to get a modified progression.
   *
   * WHAT WE'RE DOING
   * ----------------
   * We already have a progression on screen. Instead of asking the user to type
   * a new vibe, we send the current chords and scale to /api/vary. The API
   * uses a different prompt that tells the AI "here are the current chords,
   * produce a variation (optionally more X)". The response is still ChordData,
   * so we replace the current progression and BPM with the new one.
   *
   * Flow:
   *   1. Stop playback and clear active chord (same as when generating new)
   *   2. Set loading so the Vary button and Generate are disabled
   *   3. POST to /api/vary with currentProgression, scale, and optional hint
   *   4. On success: setChordData and setBpm to the new result
   *   5. On error: setError so the user sees the message
   *   6. Finally: clear loading
   *
   * (When we add History in a later feature, we'll save the current chordData
   * to history before overwriting it here.)
   */
  const handleVariation = async () => {
    if (!chordData || isLoading || isVariationLoading) return;

    setIsPlaying(false);
    setActiveChordIndex(-1);
    setIsLoading(true);
    setIsVariationLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/vary", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          currentProgression: chordData.progression,
          scale: chordData.scale,
          hint: variationHint.trim() || undefined,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || "Something went wrong. Please try again.");
        return;
      }

      setChordData(data);
      setBpm(Math.round((data.bpm[0] + data.bpm[1]) / 2));
    } catch {
      setError("Failed to connect. Check your internet and try again.");
    } finally {
      setIsLoading(false);
      setIsVariationLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen flex-col items-center bg-background px-4 py-12 font-sans text-foreground">
      <main className="w-full max-w-2xl space-y-8">
        <header className="text-center space-y-2">
          <h1 className="text-4xl font-bold tracking-tight bg-linear-to-r from-primary to-primary/80 bg-clip-text text-transparent">
            VibeChords
          </h1>
          <p className="text-sm text-muted-foreground">
            Describe a vibe. Get a chord progression. Hear it play.
          </p>
        </header>

        <VibeInput onGenerate={handleGenerate} isLoading={isLoading} />

        <div className="flex flex-col gap-2">
          <p className="text-xs text-muted-foreground">Try without API (no Gemini quota):</p>
          <div className="flex flex-wrap gap-2">
            {SAMPLE_CHORDS.map((sample, i) => (
              <Button
                key={i}
                variant="outline"
                size="sm"
                onClick={() => handleTrySample(sample)}
              >
                {sample.scale} — {sample.mood_tags[0] ?? "Sample"}
              </Button>
            ))}
          </div>
        </div>

        {error && (
          <div className="rounded-lg border border-destructive/50 bg-destructive/10 px-4 py-3 text-sm text-destructive">
            {error}
          </div>
        )}

        {chordData && (
          <div className="space-y-6">
            <div className="text-center space-y-2">
              <p className="text-lg font-semibold text-foreground">
                {chordData.scale}
                <span className="text-muted-foreground"> — </span>
                <span className="text-muted-foreground">{chordData.mode}</span>
              </p>

              {chordData.mood_tags.length > 0 && (
                <div className="flex flex-wrap justify-center gap-2">
                  {chordData.mood_tags.map((tag) => (
                    <Badge key={tag} variant="secondary" className="font-medium">
                      {tag}
                    </Badge>
                  ))}
                </div>
              )}
            </div>

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

            {chordData.explanation && (
              <p className="text-center text-sm text-muted-foreground italic max-w-lg mx-auto">
                {chordData.explanation}
              </p>
            )}

            {/* Vary: ask the AI for a variation of the current progression (optional hint) */}
            <div className="flex flex-col gap-2 sm:flex-row sm:items-end">
              <div className="flex-1 space-y-1.5">
                <Label htmlFor="vary-hint" className="text-muted-foreground text-sm">
                  Vary this progression
                </Label>
                <input
                  id="vary-hint"
                  type="text"
                  value={variationHint}
                  onChange={(e) => setVariationHint(e.target.value.slice(0, 200))}
                  placeholder='e.g. darker, jazzier (optional)'
                  disabled={isLoading}
                  className="w-full rounded-md border border-input bg-muted/30 px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                  aria-label="Optional direction for variation (e.g. darker, jazzier)"
                />
              </div>
              <Button
                onClick={handleVariation}
                disabled={isLoading}
                variant="secondary"
                className="gap-2 sm:shrink-0"
              >
                {isVariationLoading ? (
                  <>
                    <Loader2 className="size-4 animate-spin" aria-hidden />
                    Varying...
                  </>
                ) : (
                  <>
                    <Sparkles className="size-4" aria-hidden />
                    Vary
                  </>
                )}
              </Button>
            </div>

            <Card className="border-border bg-card/50">
              <CardContent className="space-y-4">
                <ChordPlayer
                  chordData={chordData}
                  bpm={bpm}
                  onBpmChange={setBpm}
                  octave={octave}
                  onOctaveChange={setOctave}
                  isPlaying={isPlaying}
                  onPlayToggle={() => setIsPlaying((prev) => !prev)}
                  onChordChange={setActiveChordIndex}
                />
                {/* Export MIDI: converts current progression to .mid and triggers download */}
                <div className="flex justify-end">
                  <ExportButton
                    chordData={chordData}
                    bpm={bpm}
                    octave={octave}
                  />
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </main>
    </div>
  );
}
