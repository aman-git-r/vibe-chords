"use client";

interface VibeChordsLogoProps {
  className?: string;
}

/**
 * Brand logo text "VibeChords" in the app's fancy cursive brand font.
 * Use this anywhere the logo should appear (splash, header, etc.) for consistency.
 */
export default function VibeChordsLogo({ className }: VibeChordsLogoProps) {
  return (
    <span
      className={`font-brand italic ${className ?? ""}`}
      style={{ fontFamily: "var(--font-brand), cursive" }}
    >
      VibeChords
    </span>
  );
}
