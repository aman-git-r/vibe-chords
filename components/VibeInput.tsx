"use client";

/**
 * VibeInput — the primary input component for VibeChords.
 *
 * This is the first thing the user interacts with. It provides:
 *   - A textarea for typing a natural-language vibe description
 *   - A live character counter (0/200) so the user knows the limit
 *   - A Generate button that triggers the AI chord generation
 *   - Loading state (disabled input + spinner text) during API calls
 *
 * Architecture notes:
 *   - This is a "controlled component": React state (`vibe`) is the single
 *     source of truth for the textarea's value. Every keystroke updates state,
 *     and state drives what's displayed. This pattern gives us full control
 *     over validation and the character counter.
 *   - The component doesn't call the API itself — it calls `onGenerate(vibe)`
 *     which the parent (page.tsx) provides. This keeps API logic centralized
 *     in one place and makes this component reusable/testable.
 */

import { useState } from "react";

interface VibeInputProps {
  /** Called with the vibe text when the user clicks Generate */
  onGenerate: (vibe: string) => void;
  /** True while waiting for the API response — disables the form */
  isLoading: boolean;
}

export default function VibeInput({ onGenerate, isLoading }: VibeInputProps) {
  // The current text in the textarea. This is a "controlled" value:
  // the textarea displays whatever is in this state, and onChange updates it.
  const [vibe, setVibe] = useState("");

  const maxLength = 200;

  // Whether the Generate button should be clickable.
  // Disabled when: loading, empty input, or only whitespace.
  const canSubmit = !isLoading && vibe.trim().length > 0;

  /**
   * handleSubmit — called when user clicks Generate or presses Enter.
   * We trim the vibe text to remove leading/trailing whitespace,
   * then pass it up to the parent via the onGenerate callback.
   */
  const handleSubmit = () => {
    if (!canSubmit) return;
    onGenerate(vibe.trim());
  };

  /**
   * handleKeyDown — lets the user press Enter to submit (like a search bar).
   * We check for Enter WITHOUT Shift held, because Shift+Enter should
   * create a new line in the textarea (standard UX convention).
   */
  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault(); // prevent the newline character from being inserted
      handleSubmit();
    }
  };

  return (
    <div className="w-full space-y-3">
      {/* Label for the input */}
      <label
        htmlFor="vibe-input"
        className="block text-sm font-medium text-zinc-400"
      >
        Describe your vibe
      </label>

      {/* Textarea wrapper — relative positioning for the char counter overlay */}
      <div className="relative">
        <textarea
          id="vibe-input"
          value={vibe}
          onChange={(e) => setVibe(e.target.value.slice(0, maxLength))}
          onKeyDown={handleKeyDown}
          placeholder='e.g. "dark trap beat, minor, aggressive" or "happy summer pop, bright and uplifting"'
          disabled={isLoading}
          rows={3}
          className="w-full resize-none rounded-xl border border-zinc-700 bg-zinc-900 px-4 py-3 text-base text-zinc-100
                     placeholder:text-zinc-600 focus:border-purple-500 focus:outline-none focus:ring-1 focus:ring-purple-500
                     disabled:cursor-not-allowed disabled:opacity-50 transition-colors"
        />

        {/* Character counter — positioned at bottom-right of the textarea */}
        <span
          className={`absolute bottom-3 right-3 text-xs ${
            vibe.length >= maxLength ? "text-red-400" : "text-zinc-500"
          }`}
        >
          {vibe.length}/{maxLength}
        </span>
      </div>

      {/* Generate button */}
      <button
        onClick={handleSubmit}
        disabled={!canSubmit}
        className="w-full rounded-xl bg-purple-600 px-6 py-3 text-base font-semibold text-white
                   transition-all hover:bg-purple-500 active:scale-[0.98]
                   disabled:cursor-not-allowed disabled:bg-zinc-700 disabled:text-zinc-500"
      >
        {isLoading ? (
          <span className="flex items-center justify-center gap-2">
            {/* Simple CSS spinner — a spinning border trick */}
            <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
            Generating...
          </span>
        ) : (
          "Generate Chords"
        )}
      </button>
    </div>
  );
}
