import { NextRequest, NextResponse } from "next/server";
import { generateChords } from "@/lib/gemini";

/**
 * POST /api/generate
 *
 * This is VibeChords' only API endpoint. It sits at:
 *   app/api/generate/route.ts  →  http://localhost:3000/api/generate
 *
 * In Next.js App Router, the file path determines the URL. Exporting a
 * function named POST means this file handles HTTP POST requests to that URL.
 *
 * Request body:
 *   { "vibe": "dark trap beat, minor, aggressive" }
 *
 * Success response (200):
 *   { "progression": [...], "bpm": [...], "scale": "...", ... }
 *
 * Error responses:
 *   400 — client sent invalid input (missing, empty, or too-long vibe)
 *   429 — Gemini's free tier rate limit was hit
 *   500 — something unexpected broke (AI failure, JSON parse error, etc.)
 *
 * Security note:
 *   We NEVER expose raw error messages to the client. Internal errors are
 *   logged to the server console (visible in your terminal) and a generic
 *   user-friendly message is returned instead. This prevents leaking stack
 *   traces, API keys, or internal implementation details.
 */
export async function POST(request: NextRequest) {
  try {
    // ──────────────────────────────────────────────────────────
    // Step 1: Parse the incoming JSON body
    // ──────────────────────────────────────────────────────────
    // request.json() reads the body stream and parses it as JSON.
    // If the body isn't valid JSON, this will throw and we catch it below.
    const body = await request.json();
    const vibe = body.vibe;

    // ──────────────────────────────────────────────────────────
    // Step 2: Input validation
    // ──────────────────────────────────────────────────────────
    // We validate on the server even though the frontend will also validate.
    // Never trust client-side validation alone — anyone can call your API
    // directly with curl, Postman, or a script.

    // Check that the vibe field exists and is a string
    if (!vibe || typeof vibe !== "string") {
      return NextResponse.json(
        { error: "Please provide a vibe description." },
        { status: 400 }
      );
    }

    // Check it's not just whitespace
    if (vibe.trim().length === 0) {
      return NextResponse.json(
        { error: "Vibe cannot be empty." },
        { status: 400 }
      );
    }

    // Enforce the 200-character limit (prevents prompt injection abuse
    // and keeps the AI prompt focused)
    if (vibe.length > 200) {
      return NextResponse.json(
        { error: "Vibe must be 200 characters or fewer." },
        { status: 400 }
      );
    }

    // ──────────────────────────────────────────────────────────
    // Step 3: Call the AI via our Gemini client
    // ──────────────────────────────────────────────────────────
    // generateChords() handles prompt building, API call, JSON cleaning,
    // and schema validation. It returns a typed ChordData object or throws.
    const chordData = await generateChords(vibe.trim());

    // ──────────────────────────────────────────────────────────
    // Step 4: Return the validated ChordData as JSON
    // ──────────────────────────────────────────────────────────
    // NextResponse.json() automatically sets Content-Type: application/json
    // and serializes the object.
    return NextResponse.json(chordData);
  } catch (error: unknown) {
    // ──────────────────────────────────────────────────────────
    // Error handling
    // ──────────────────────────────────────────────────────────
    // Log the full error server-side so WE can debug it
    console.error("Error in /api/generate:", error);

    // Extract the error message (safely, since `error` is `unknown`)
    const message =
      error instanceof Error ? error.message : "Unknown error";

    // Detect Gemini rate-limit errors and return 429.
    // We check for "rate limit" (not just "rate") because words like
    // "generate" contain "rate" as a substring and would false-match.
    if (message.includes("429") || message.toLowerCase().includes("rate limit") || message.toLowerCase().includes("quota")) {
      return NextResponse.json(
        { error: "Too many requests. Please try again shortly." },
        { status: 429 }
      );
    }

    // For everything else, return a generic 500 error.
    // The real error is in the server logs, not exposed to the client.
    return NextResponse.json(
      { error: "Failed to generate chords. Please try again." },
      { status: 500 }
    );
  }
}
