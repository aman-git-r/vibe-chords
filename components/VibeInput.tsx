"use client";

/**
 * VibeInput — the primary input component for VibeChords.
 *
 * Uses shadcn/ui: Label, Textarea, and Button for consistent styling
 * and accessibility. The component remains a controlled input with
 * character counter and loading state.
 */

import { useState } from "react";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";

interface VibeInputProps {
  onGenerate: (vibe: string) => void;
  isLoading: boolean;
}

export default function VibeInput({ onGenerate, isLoading }: VibeInputProps) {
  const [vibe, setVibe] = useState("");
  const maxLength = 200;
  const canSubmit = !isLoading && vibe.trim().length > 0;

  const handleSubmit = () => {
    if (!canSubmit) return;
    onGenerate(vibe.trim());
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  return (
    <div className="w-full space-y-3">
      <Label htmlFor="vibe-input" className="text-muted-foreground">
        Describe your vibe
      </Label>

      <div className="relative">
        <Textarea
          id="vibe-input"
          value={vibe}
          onChange={(e) => setVibe(e.target.value.slice(0, maxLength))}
          onKeyDown={handleKeyDown}
          placeholder='e.g. "dark trap beat, minor, aggressive" or "happy summer pop, bright and uplifting"'
          disabled={isLoading}
          rows={3}
          className="min-h-20 resize-none pr-16 bg-muted/30 border-input"
        />
        <span
          className={`absolute bottom-3 right-3 text-xs ${
            vibe.length >= maxLength ? "text-destructive" : "text-muted-foreground"
          }`}
        >
          {vibe.length}/{maxLength}
        </span>
      </div>

      <Button
        onClick={handleSubmit}
        disabled={!canSubmit}
        className="w-full rounded-lg font-semibold bg-gradient-to-r from-primary to-accent shadow-md hover:shadow-lg hover:shadow-primary/25 transition-shadow"
        size="lg"
      >
        {isLoading ? (
          <>
            <Loader2 className="size-4 animate-spin" aria-hidden />
            Generating...
          </>
        ) : (
          "Generate Chords"
        )}
      </Button>
    </div>
  );
}
