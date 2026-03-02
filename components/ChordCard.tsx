"use client";

/**
 * ChordCard — displays a single chord from the progression.
 *
 * This is a pure presentational component: it has no state of its own.
 * Everything it needs comes through props from the parent (page.tsx).
 *
 * Visual behavior:
 *   - Normally shows the chord name on a dark card with a subtle border
 *   - When `isActive` is true (this chord is currently playing), the card
 *     gets a purple ring, a slight scale-up, and a glow effect — creating
 *     a "bouncing ball" visual that follows the playback
 *   - The chord's position number (1, 2, 3...) is shown in small text
 *     above the chord name for easy reference
 *
 * The transition classes ensure the highlight animates smoothly rather
 * than snapping on/off, which feels much more polished.
 */

interface ChordCardProps {
  /** The chord symbol to display, e.g. "Cm7" or "Fmaj7" */
  chord: string;
  /** 0-based position in the progression (displayed as 1-based) */
  index: number;
  /** True when this chord is the one currently being played */
  isActive: boolean;
}

export default function ChordCard({ chord, index, isActive }: ChordCardProps) {
  return (
    <div
      className={`
        flex flex-col items-center justify-center gap-1
        rounded-xl border px-5 py-4 min-w-[80px]
        transition-all duration-200 ease-out
        ${
          isActive
            ? "border-purple-500 bg-purple-500/15 scale-105 shadow-lg shadow-purple-500/20"
            : "border-zinc-700 bg-zinc-800/50 hover:border-zinc-600"
        }
      `}
    >
      {/* Position number — small muted text above the chord name */}
      <span className="text-[11px] font-medium text-zinc-500">
        {index + 1}
      </span>

      {/* Chord name — the main visual element */}
      <span
        className={`text-xl font-bold tracking-wide ${
          isActive ? "text-purple-300" : "text-zinc-100"
        }`}
      >
        {chord}
      </span>
    </div>
  );
}
