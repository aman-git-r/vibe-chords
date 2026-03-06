"use client";

import VibeChordsLogo from "@/components/VibeChordsLogo";
import { Music, Music2, Music3, Music4 } from "lucide-react";

type NoteVariant = "music" | "music2" | "music3" | "music4";

/** Positions, size, rotation and symbol variant for background notes */
const NOTE_POSITIONS: {
  left: string;
  top: string;
  size: number;
  rot: number;
  variant: NoteVariant;
}[] = [
  { left: "8%", top: "12%", size: 56, rot: -12, variant: "music" },
  { left: "22%", top: "8%", size: 48, rot: 6, variant: "music2" },
  { left: "85%", top: "15%", size: 68, rot: 8, variant: "music3" },
  { left: "72%", top: "22%", size: 44, rot: -6, variant: "music4" },
  { left: "12%", top: "35%", size: 52, rot: 3, variant: "music3" },
  { left: "90%", top: "38%", size: 60, rot: -10, variant: "music" },
  { left: "5%", top: "58%", size: 64, rot: 5, variant: "music2" },
  { left: "78%", top: "55%", size: 48, rot: -8, variant: "music4" },
  { left: "18%", top: "78%", size: 44, rot: -4, variant: "music3" },
  { left: "88%", top: "82%", size: 56, rot: 7, variant: "music" },
  { left: "42%", top: "18%", size: 40, rot: 10, variant: "music4" },
  { left: "55%", top: "75%", size: 52, rot: -5, variant: "music2" },
  { left: "35%", top: "88%", size: 48, rot: 4, variant: "music" },
  { left: "62%", top: "10%", size: 44, rot: -7, variant: "music3" },
];

const NOTE_ICONS = { music: Music, music2: Music2, music3: Music3, music4: Music4 };

interface SplashScreenProps {
  onDismiss: () => void;
}

export default function SplashScreen({ onDismiss }: SplashScreenProps) {
  return (
    <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-background">
      {/* Musical notes wallpaper */}
      <div
        className="absolute inset-0 overflow-hidden pointer-events-none"
        aria-hidden
      >
        {NOTE_POSITIONS.map((pos, i) => {
          const Icon = NOTE_ICONS[pos.variant];
          return (
            <Icon
              key={i}
              className="absolute text-primary/10 dark:text-primary/15"
              style={{
                left: pos.left,
                top: pos.top,
                width: pos.size,
                height: pos.size,
                transform: `rotate(${pos.rot}deg)`,
              }}
            />
          );
        })}
      </div>

      <div className="relative z-10 flex flex-col items-center">
        <h1 className="animate-splash-fade-up">
          <VibeChordsLogo className="text-5xl sm:text-6xl font-bold tracking-wider bg-linear-to-r from-primary to-primary/70 bg-clip-text text-transparent" />
        </h1>

        <p className="mt-4 text-base sm:text-lg text-muted-foreground animate-splash-fade-up animation-delay-300">
          Describe a vibe. Get chords.
        </p>

        <button
          onClick={onDismiss}
          className="mt-8 rounded-full bg-primary px-8 py-3 text-sm font-semibold text-primary-foreground shadow-lg hover:bg-primary/90 transition-colors animate-splash-fade-up animation-delay-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
        >
          Get Started
        </button>
      </div>
    </div>
  );
}
