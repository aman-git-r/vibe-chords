"use client";

import { useState, useRef } from "react";
import { ChordData } from "@/types/chord";
import HistoryPanel, { ChatMessage } from "@/components/HistoryPanel";
import SplashScreen from "@/components/SplashScreen";
import ChordCard from "@/components/ChordCard";
import ChordPlayer from "@/components/ChordPlayer";
import ExportButton from "@/components/ExportButton";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { SAMPLE_CHORDS } from "@/lib/sampleChords";
import { Loader2, Send, Sparkles } from "lucide-react";
import ThemeToggle from "@/components/ThemeToggle";
import VibeChordsLogo from "@/components/VibeChordsLogo";

const QUICK_PROMPTS = [
  "Dreamy lo-fi sunset",
  "Aggressive dark trap",
  "Happy summer pop",
];

export default function Home() {
  const [showSplash, setShowSplash] = useState(true);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [chordData, setChordData] = useState<ChordData | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [bpm, setBpm] = useState(120);
  const [isPlaying, setIsPlaying] = useState(false);
  const [octave, setOctave] = useState(3);
  const [activeChordIndex, setActiveChordIndex] = useState(-1);
  const [input, setInput] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);
  const maxLength = 200;

  const canSubmit = !isLoading && input.trim().length > 0;

  const addMessage = (msg: ChatMessage) =>
    setMessages((prev) => [...prev, msg]);

  const msgId = () => crypto.randomUUID();

  const handleSend = async (text: string) => {
    addMessage({ id: msgId(), role: "user", content: text });

    setIsPlaying(false);
    setActiveChordIndex(-1);
    setIsLoading(true);

    try {
      const isVariation = chordData !== null;
      const response = await fetch(
        isVariation ? "/api/vary" : "/api/generate",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(
            isVariation
              ? {
                  currentProgression: chordData.progression,
                  scale: chordData.scale,
                  hint: text,
                }
              : { vibe: text }
          ),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        addMessage({
          id: msgId(),
          role: "assistant",
          content: data.error || "Something went wrong. Please try again.",
        });
        return;
      }

      setChordData(data);
      setBpm(Math.round((data.bpm[0] + data.bpm[1]) / 2));
      addMessage({
        id: msgId(),
        role: "assistant",
        content: data.explanation,
        chordData: data,
      });
    } catch {
      addMessage({
        id: msgId(),
        role: "assistant",
        content: "Failed to connect. Check your internet and try again.",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleTrySample = (sample: ChordData) => {
    setIsPlaying(false);
    setActiveChordIndex(-1);
    setChordData(sample);
    setBpm(Math.round((sample.bpm[0] + sample.bpm[1]) / 2));
    addMessage({
      id: msgId(),
      role: "assistant",
      content: sample.explanation,
      chordData: sample,
    });
  };

  const handleSelectMessage = (data: ChordData) => {
    setIsPlaying(false);
    setActiveChordIndex(-1);
    setChordData(data);
    setBpm(Math.round((data.bpm[0] + data.bpm[1]) / 2));
  };

  const handleInputSubmit = () => {
    if (!canSubmit) return;
    handleSend(input.trim());
    setInput("");
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleInputSubmit();
    }
  };

  if (showSplash) {
    return <SplashScreen onDismiss={() => setShowSplash(false)} />;
  }

  return (
    <div className="h-screen overflow-hidden bg-background font-sans text-foreground flex flex-col">
      <header className="flex items-center justify-between border-b border-border px-4 py-2">
        <VibeChordsLogo className="text-xl" />
        <ThemeToggle />
      </header>

      <div
        className={`flex-1 overflow-hidden w-full grid grid-cols-1 ${
          chordData ? "lg:grid-cols-[1fr_380px]" : ""
        }`}
      >
        {/* Left column — chords + input */}
        <div className="flex flex-col h-full overflow-hidden p-4">
          <div className="flex-1 overflow-y-auto">
            {chordData ? (
              <div className="flex flex-col gap-6 py-2 max-w-2xl mx-auto">
                <div className="text-center space-y-2">
                  <p className="text-lg font-semibold text-foreground">
                    {chordData.scale}
                    <span className="text-muted-foreground"> — </span>
                    <span className="text-muted-foreground">
                      {chordData.mode}
                    </span>
                  </p>

                  {chordData.mood_tags.length > 0 && (
                    <div className="flex flex-wrap justify-center gap-2">
                      {chordData.mood_tags.map((tag) => (
                        <Badge
                          key={tag}
                          variant="secondary"
                          className="font-medium"
                        >
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
            ) : (
              <div className="flex h-full flex-col items-center justify-center gap-8 text-center px-4">
                <div className="space-y-2">
                  <Sparkles className="mx-auto size-10 text-primary/60" />
                  <h2 className="text-lg font-semibold text-foreground">
                    What kind of chords are you looking for?
                  </h2>
                  <p className="text-sm text-muted-foreground max-w-md mx-auto">
                    Describe a mood, genre, or feeling to generate a chord
                    progression.
                  </p>
                </div>

                <div className="space-y-3">
                  <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                    Quick prompts
                  </p>
                  <div className="flex flex-wrap justify-center gap-2">
                    {QUICK_PROMPTS.map((prompt) => (
                      <button
                        key={prompt}
                        type="button"
                        onClick={() => handleSend(prompt)}
                        className="rounded-full border border-primary/30 bg-primary/5 px-4 py-2 text-sm font-medium text-primary transition-colors hover:bg-primary/10 hover:border-primary/50 cursor-pointer"
                      >
                        {prompt}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="space-y-3">
                  <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                    Or try a sample (no API)
                  </p>
                  <div className="flex flex-wrap justify-center gap-2">
                    {SAMPLE_CHORDS.map((sample, i) => (
                      <Button
                        key={i}
                        variant="outline"
                        size="sm"
                        className="rounded-full border-accent/40 bg-background/40 text-accent-foreground hover:border-accent hover:bg-accent/15 text-xs"
                        onClick={() => handleTrySample(sample)}
                      >
                        {sample.scale} — {sample.mood_tags[0] ?? "Sample"}
                      </Button>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>

          {isLoading && (
            <div className="flex items-center justify-center gap-2 px-4 py-2 text-sm text-muted-foreground">
              <Loader2 className="size-4 animate-spin" />
              <span>Generating chords&hellip;</span>
            </div>
          )}

          {/* Claude-style input pinned at bottom */}
          <div className="shrink-0 px-4 pb-4 pt-2">
            <div className="mx-auto max-w-2xl">
              <div className="flex items-center gap-2 rounded-2xl border border-input bg-background px-4 py-2.5 shadow-sm transition-colors focus-within:ring-2 focus-within:ring-ring focus-within:border-transparent">
                <input
                  ref={inputRef}
                  type="text"
                  value={input}
                  onChange={(e) =>
                    setInput(e.target.value.slice(0, maxLength))
                  }
                  onKeyDown={handleKeyDown}
                  placeholder={
                    chordData
                      ? "Follow up or describe a new vibe\u2026"
                      : "Describe a vibe\u2026"
                  }
                  disabled={isLoading}
                  className="flex-1 bg-transparent text-sm placeholder:text-muted-foreground focus:outline-none disabled:cursor-not-allowed disabled:opacity-50"
                  aria-label="Describe a vibe or follow up"
                />
                <Button
                  size="icon"
                  onClick={handleInputSubmit}
                  disabled={!canSubmit}
                  className="shrink-0 rounded-xl size-8"
                  aria-label="Send"
                >
                  <Send className="size-4" />
                </Button>
              </div>
            </div>
          </div>
        </div>

        {/* Right column — history of generated progressions */}
        {chordData && (
          <HistoryPanel
            messages={messages}
            activeChordData={chordData}
            onSelectMessage={handleSelectMessage}
          />
        )}
      </div>
    </div>
  );
}
