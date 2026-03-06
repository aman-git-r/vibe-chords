"use client";

import VibeChordsLogo from "@/components/VibeChordsLogo";

interface SplashScreenProps {
  onDismiss: () => void;
}

export default function SplashScreen({ onDismiss }: SplashScreenProps) {
  return (
    <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-background">
      <h1 className="animate-splash-fade-up">
        <VibeChordsLogo className="text-5xl sm:text-6xl font-bold tracking-tight bg-linear-to-r from-primary to-primary/70 bg-clip-text text-transparent" />
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
  );
}
