"use client";

import { useEffect, useRef, useState } from "react";
import type { ChordData } from "@/types/chord";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Loader2, Send, Sparkles } from "lucide-react";

export interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  chordData?: ChordData;
}

interface ChatPanelProps {
  messages: ChatMessage[];
  onSend: (text: string) => void;
  isLoading: boolean;
  onSelectMessage: (chordData: ChordData) => void;
  samples: ChordData[];
  onTrySample: (sample: ChordData) => void;
}

export default function ChatPanel({
  messages,
  onSend,
  isLoading,
  onSelectMessage,
  samples,
  onTrySample,
}: ChatPanelProps) {
  const [input, setInput] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const maxLength = 200;

  const canSubmit = !isLoading && input.trim().length > 0;

  useEffect(() => {
    const el = scrollRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [messages]);

  const handleSubmit = () => {
    if (!canSubmit) return;
    onSend(input.trim());
    setInput("");
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  const isEmpty = messages.length === 0;

  return (
    <div className="flex h-full flex-col rounded-xl border border-border bg-card/60 shadow-sm">
      {/* Scrollable message area */}
      <div
        ref={scrollRef}
        className="flex-1 overflow-y-auto px-4 py-4 space-y-3"
      >
        {isEmpty ? (
          <EmptyState
            samples={samples}
            onTrySample={onTrySample}
            onSend={onSend}
            inputRef={inputRef}
          />
        ) : (
          messages.map((msg) =>
            msg.role === "user" ? (
              <UserBubble key={msg.id} content={msg.content} />
            ) : (
              <AssistantBubble
                key={msg.id}
                message={msg}
                onSelect={onSelectMessage}
              />
            )
          )
        )}

        {isLoading && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground px-1 py-2">
            <Loader2 className="size-4 animate-spin" />
            <span>Thinking&hellip;</span>
          </div>
        )}
      </div>

      {/* Sticky input bar */}
      <div className="border-t border-border px-3 py-3">
        <div className="flex items-center gap-2">
          <input
            ref={inputRef}
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value.slice(0, maxLength))}
            onKeyDown={handleKeyDown}
            placeholder={
              isEmpty
                ? "Describe a vibe\u2026"
                : "Follow up or describe a new vibe\u2026"
            }
            disabled={isLoading}
            className="flex-1 rounded-lg border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
            aria-label="Describe a vibe or follow up"
          />
          <Button
            size="icon"
            onClick={handleSubmit}
            disabled={!canSubmit}
            className="shrink-0 rounded-lg"
            aria-label="Send"
          >
            <Send className="size-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}

/* ── Sub-components ─────────────────────────────────────────────────── */

function EmptyState({
  samples,
  onTrySample,
  onSend,
  inputRef,
}: {
  samples: ChordData[];
  onTrySample: (s: ChordData) => void;
  onSend: (text: string) => void;
  inputRef: React.RefObject<HTMLInputElement | null>;
}) {
  const quickPrompts = [
    "Dreamy lo-fi sunset",
    "Aggressive dark trap",
    "Happy summer pop",
  ];

  return (
    <div className="flex h-full flex-col items-center justify-center gap-6 text-center py-8">
      <div className="space-y-1">
        <Sparkles className="mx-auto size-8 text-primary/60" />
        <p className="text-sm font-medium text-foreground">
          What kind of chords are you looking for?
        </p>
        <p className="text-xs text-muted-foreground">
          Describe a mood, genre, or feeling below.
        </p>
      </div>

      {/* Quick prompt chips */}
      <div className="space-y-2">
        <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
          Quick prompts
        </p>
        <div className="flex flex-wrap justify-center gap-2">
          {quickPrompts.map((prompt) => (
            <button
              key={prompt}
              type="button"
              onClick={() => onSend(prompt)}
              className="rounded-full border border-primary/30 bg-primary/5 px-3 py-1.5 text-xs font-medium text-primary transition-colors hover:bg-primary/10 hover:border-primary/50"
            >
              {prompt}
            </button>
          ))}
        </div>
      </div>

      {/* Sample suggestion chips */}
      <div className="space-y-2">
        <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
          Or try a sample (no API)
        </p>
        <div className="flex flex-wrap justify-center gap-2">
          {samples.map((sample, i) => (
            <Button
              key={i}
              variant="outline"
              size="sm"
              className="rounded-full border-accent/40 bg-background/40 text-accent-foreground hover:border-accent hover:bg-accent/15 text-xs"
              onClick={() => onTrySample(sample)}
            >
              {sample.scale} — {sample.mood_tags[0] ?? "Sample"}
            </Button>
          ))}
        </div>
      </div>
    </div>
  );
}

function UserBubble({ content }: { content: string }) {
  return (
    <div className="flex justify-end">
      <div className="max-w-[80%] rounded-2xl rounded-br-md bg-primary px-3.5 py-2 text-sm text-primary-foreground">
        {content}
      </div>
    </div>
  );
}

function AssistantBubble({
  message,
  onSelect,
}: {
  message: ChatMessage;
  onSelect: (chordData: ChordData) => void;
}) {
  const { chordData, content } = message;

  if (!chordData) {
    return (
      <div className="flex justify-start">
        <div className="max-w-[85%] rounded-2xl rounded-bl-md border border-border bg-secondary/60 px-3.5 py-2 text-sm text-foreground">
          {content}
        </div>
      </div>
    );
  }

  const truncatedExplanation =
    chordData.explanation.length > 100
      ? chordData.explanation.slice(0, 100) + "…"
      : chordData.explanation;

  return (
    <div className="flex justify-start">
      <button
        type="button"
        onClick={() => onSelect(chordData)}
        className="max-w-[85%] rounded-2xl rounded-bl-md border border-border bg-secondary/60 px-3.5 py-2.5 text-left transition-colors hover:bg-secondary/90 hover:border-primary/30 cursor-pointer"
      >
        <p className="text-sm font-semibold text-foreground">
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
          {truncatedExplanation}
        </p>
      </button>
    </div>
  );
}
