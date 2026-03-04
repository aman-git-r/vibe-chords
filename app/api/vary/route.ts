/**
 * POST /api/vary
 *
 * This endpoint generates a VARIATION of an existing chord progression.
 * Unlike /api/generate (which takes a vibe string), /api/vary takes the
 * current chords and scale and asks the AI to modify them — e.g. "make it
 * darker" or just "give me a creative variation".
 *
 * WHAT WE'RE DOING
 * ----------------
 * The frontend already has a progression on screen. When the user clicks
 * "Vary", we send that progression and scale (and an optional hint) to this
 * route. We call generateVariation(), which uses a different prompt that
 * tells the AI "here are the current chords, produce a variation." The
 * response is still ChordData, so the frontend can replace the current
 * progression with the new one and keep the same UI.
 *
 * Request body:
 *   {
 *     currentProgression: string[],  // e.g. ["Cm", "Ab", "Bb", "Gm"]
 *     scale: string,                 // e.g. "C Minor"
 *     hint?: string                  // optional: "darker", "jazzier", etc.
 *   }
 *
 * Success (200): ChordData JSON, same shape as /api/generate.
 * Errors: 400 (invalid input), 429 (rate limit), 500 (AI/parse failure).
 */

import { NextRequest, NextResponse } from "next/server";
import { generateVariation } from "@/lib/gemini";

export async function POST(request: NextRequest) {
  try {
    // ── Step 1: Parse and validate the request body ─────────────────────
    const body = await request.json();
    const { currentProgression, scale, hint } = body;

    // currentProgression: required, must be non-empty array of strings
    if (!Array.isArray(currentProgression) || currentProgression.length === 0) {
      return NextResponse.json(
        { error: "Please provide a non-empty chord progression to vary." },
        { status: 400 }
      );
    }
    if (!currentProgression.every((c: unknown) => typeof c === "string")) {
      return NextResponse.json(
        { error: "Each chord in the progression must be a string." },
        { status: 400 }
      );
    }

    // scale: required, non-empty string
    if (!scale || typeof scale !== "string" || scale.trim().length === 0) {
      return NextResponse.json(
        { error: "Please provide the scale (key) of the progression." },
        { status: 400 }
      );
    }

    // hint: optional; if provided, must be string and not too long (same 200-char sanity limit as vibe)
    if (hint !== undefined && hint !== null) {
      if (typeof hint !== "string") {
        return NextResponse.json(
          { error: "Variation hint must be a string." },
          { status: 400 }
        );
      }
      if (hint.length > 200) {
        return NextResponse.json(
          { error: "Variation hint must be 200 characters or fewer." },
          { status: 400 }
        );
      }
    }

    // ── Step 2: Call the AI to generate a variation ────────────────────
    const chordData = await generateVariation(
      currentProgression,
      scale.trim(),
      typeof hint === "string" && hint.trim().length > 0 ? hint.trim() : undefined
    );

    return NextResponse.json(chordData);
  } catch (error: unknown) {
    console.error("Error in /api/vary:", error);

    const message =
      error instanceof Error ? error.message : "Unknown error";

    if (
      message.includes("429") ||
      message.toLowerCase().includes("rate limit") ||
      message.toLowerCase().includes("quota")
    ) {
      return NextResponse.json(
        { error: "Too many requests. Please try again shortly." },
        { status: 429 }
      );
    }

    return NextResponse.json(
      { error: "Failed to generate variation. Please try again." },
      { status: 500 }
    );
  }
}
