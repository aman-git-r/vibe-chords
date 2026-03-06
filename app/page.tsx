"use client";

import { useState } from "react";
import { ChordData } from "@/types/chord";
import ChatPanel, { ChatMessage } from "@/components/ChatPanel";
import SplashScreen from "@/components/SplashScreen";
import ChordCard from "@/components/ChordCard";
import ChordPlayer from "@/components/ChordPlayer";
import ExportButton from "@/components/ExportButton";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { SAMPLE_CHORDS } from "@/lib/sampleChords";
import { Music } from "lucide-react";
import ThemeToggle from "@/components/ThemeToggle";

export default function Home() {
  const [showSplash, setShowSplash] = useState(true);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [chordData, setChordData] = useState<ChordData | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [bpm, setBpm] = useState(120);
  const [isPlaying, setIsPlaying] = useState(false);
  const [octave, setOctave] = useState(3);
  const [activeChordIndex, setActiveChordIndex] = useState(-1);

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

  if (showSplash) {
    return <SplashScreen onDismiss={() => setShowSplash(false)} />;
  }

  return (
    <div className="h-screen overflow-hidden bg-background px-4 py-4 font-sans text-foreground">
      <div className="flex justify-end pb-2 max-w-7xl mx-auto">
        <ThemeToggle />
      </div>
      <div className="mx-auto grid h-[calc(100%-3rem)] max-w-7xl grid-cols-1 gap-6 lg:grid-cols-[1.4fr_1fr]">
        {/* Left column — chord result area */}
        <div className="flex flex-col overflow-y-auto rounded-xl">
          {chordData ? (
            <div className="flex flex-1 flex-col gap-6 py-2">
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
            <div className="flex flex-1 flex-col items-center justify-center gap-3 text-center text-muted-foreground">
              <Music className="size-12 opacity-30" />
              <p className="text-sm font-medium">No chords yet</p>
              <p className="text-xs max-w-xs">
                Describe a vibe in the chat to generate a chord progression, or
                try one of the sample presets.
              </p>
            </div>
          )}
        </div>

        {/* Right column — chat panel */}
        <ChatPanel
          messages={messages}
          onSend={handleSend}
          isLoading={isLoading}
          onSelectMessage={handleSelectMessage}
          samples={SAMPLE_CHORDS}
          onTrySample={handleTrySample}
        />
      </div>
    </div>
  );
}
