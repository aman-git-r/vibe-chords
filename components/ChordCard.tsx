"use client";

/**
 * ChordCard — displays a single chord from the progression.
 *
 * Uses shadcn Card for the container. When isActive, we apply
 * ring and scale via className for the "bouncing ball" highlight.
 */

import { cn } from "@/lib/utils";
import { Card, CardContent } from "@/components/ui/card";

interface ChordCardProps {
  chord: string;
  index: number;
  isActive: boolean;
}

export default function ChordCard({ chord, index, isActive }: ChordCardProps) {
  return (
    <Card
      className={cn(
        "min-w-[80px] transition-all duration-200 ease-out",
        isActive
          ? "border-primary bg-primary/15 scale-105 shadow-lg shadow-primary/20"
          : "border-border bg-card/80 hover:border-muted-foreground/30"
      )}
    >
      <CardContent className="flex flex-col items-center justify-center gap-1 p-4">
        <span className="text-[11px] font-medium text-muted-foreground">
          {index + 1}
        </span>
        <span
          className={cn(
            "text-xl font-bold tracking-wide",
            isActive ? "text-primary" : "text-foreground"
          )}
        >
          {chord}
        </span>
      </CardContent>
    </Card>
  );
}
