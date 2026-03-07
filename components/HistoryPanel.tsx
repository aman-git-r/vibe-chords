"use client";

import { useEffect, useRef } from "react";
import type { ChordData } from "@/types/chord";
import { Badge } from "@/components/ui/badge";
import { History } from "lucide-react";

export interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  chordData?: ChordData;
}

interface HistoryPanelProps {
  messages: ChatMessage[];
  activeChordData: ChordData | null;
  onSelectMessage: (chordData: ChordData) => void;
}

export default function HistoryPanel({
  messages,
  activeChordData,
  onSelectMessage,
}: HistoryPanelProps) {
  const scrollRef = useRef<HTMLDivElement>(null);

  const chordEntries = messages.filter(
    (msg) => msg.role === "assistant" && msg.chordData
  );

  useEffect(() => {
    const el = scrollRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [chordEntries.length]);

  return (
    <div className="flex h-full flex-col rounded-xl border border-border bg-card/60 shadow-sm">
      <div className="flex items-center gap-2 px-4 py-3 border-b border-border">
        <History className="size-4 text-muted-foreground" />
        <h2 className="text-sm font-semibold text-foreground">History</h2>
        <span className="ml-auto text-xs text-muted-foreground">
          {chordEntries.length}
        </span>
      </div>

      <div
        ref={scrollRef}
        className="flex-1 overflow-y-auto px-3 py-3 space-y-2"
      >
        {chordEntries.map((msg) => {
          const data = msg.chordData!;
          const isActive =
            activeChordData !== null &&
            activeChordData.scale === data.scale &&
            activeChordData.mode === data.mode &&
            activeChordData.explanation === data.explanation;

          return (
            <HistoryEntry
              key={msg.id}
              chordData={data}
              isActive={isActive}
              onSelect={() => onSelectMessage(data)}
            />
          );
        })}
      </div>
    </div>
  );
}

function HistoryEntry({
  chordData,
  isActive,
  onSelect,
}: {
  chordData: ChordData;
  isActive: boolean;
  onSelect: () => void;
}) {
  const truncated =
    chordData.explanation.length > 90
      ? chordData.explanation.slice(0, 90) + "\u2026"
      : chordData.explanation;

  return (
    <button
      type="button"
      onClick={onSelect}
      className={`w-full rounded-lg border px-3 py-2.5 text-left transition-colors cursor-pointer ${
        isActive
          ? "border-primary/50 bg-primary/10"
          : "border-border bg-secondary/40 hover:bg-secondary/70 hover:border-primary/20"
      }`}
    >
      <p className="text-sm font-semibold text-foreground leading-tight">
        {chordData.scale}
        <span className="text-muted-foreground font-normal">
          {" "}
          &middot; {chordData.mode}
        </span>
      </p>

      {chordData.mood_tags.length > 0 && (
        <div className="mt-1.5 flex flex-wrap gap-1">
          {chordData.mood_tags.map((tag) => (
            <Badge
              key={tag}
              variant="secondary"
              className="text-[10px] px-1.5 py-0"
            >
              {tag}
            </Badge>
          ))}
        </div>
      )}

      <p className="mt-1.5 text-xs text-muted-foreground leading-relaxed">
        {truncated}
      </p>
    </button>
  );
}
