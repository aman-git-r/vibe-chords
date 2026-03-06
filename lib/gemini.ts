import { GoogleGenerativeAI } from "@google/generative-ai";
import { ChordData } from "@/types/chord";
import { buildPrompt, buildVariationPrompt } from "@/lib/promptBuilder";

/**
 * getGeminiClient()
 *
 * Creates and returns a configured GoogleGenerativeAI instance.
 *
 * Why is this a function instead of a top-level constant?
 * ---------------------------------------------------------
 * In Next.js, `process.env` values are injected at runtime for API routes.
 * If we wrote `const client = new GoogleGenerativeAI(process.env.GEMINI_API_KEY)`
 * at the top level, it would execute during the module's first import — which
 * could happen at BUILD time when the env var doesn't exist yet. Wrapping it
 * in a function means we only read the env var when someone actually calls
 * generateChords(), which is always at runtime inside an API route.
 */
function getGeminiClient(): GoogleGenerativeAI {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error(
      "GEMINI_API_KEY is not set. Add it to .env.local — " +
        "see https://aistudio.google.com to get a free key."
    );
  }
  return new GoogleGenerativeAI(apiKey);
}

/**
 * cleanJsonResponse(raw)
 *
 * Takes the raw text string that Gemini returned and extracts the JSON object.
 *
 * Why do we need this?
 * --------------------
 * Even though our prompt says "return JSON only, no markdown", LLMs don't
 * always follow instructions perfectly. Common failure modes:
 *
 *   1. Gemini wraps the JSON in markdown code fences:
 *        ```json
 *        { "progression": [...] }
 *        ```
 *
 *   2. Gemini adds a sentence before or after the JSON:
 *        "Here is the chord progression:\n{ ... }\nHope this helps!"
 *
 * Our strategy handles both:
 *   Step 1 — strip ```json and ``` markers with a regex
 *   Step 2 — find the first '{' and last '}' in the cleaned string
 *   Step 3 — slice out everything between those braces (inclusive)
 *
 * If there are no braces at all, the AI returned something completely
 * wrong, so we throw an error that will be caught by the route handler.
 *
 * @param raw - The raw text from Gemini's response
 * @returns A clean JSON string ready for JSON.parse()
 */
export function cleanJsonResponse(raw: string): string {
  // Step 1: strip markdown code fences (case-insensitive for ```JSON vs ```json)
  const cleaned = raw.replace(/```json\s*/gi, "").replace(/```/g, "");

  // Step 2: locate the outermost JSON object boundaries
  const start = cleaned.indexOf("{");
  const end = cleaned.lastIndexOf("}");

  if (start === -1 || end === -1) {
    throw new Error("No JSON object found in AI response");
  }

  // Step 3: extract just the JSON object
  return cleaned.slice(start, end + 1);
}

/**
 * validateChordData(data)
 *
 * Runtime validation of the parsed JSON against our ChordData schema.
 *
 * Why can't TypeScript handle this?
 * ---------------------------------
 * TypeScript types are erased at compile time — they produce zero runtime code.
 * Writing `const d = parsed as ChordData` doesn't actually CHECK anything; it
 * just tells the compiler "trust me". Since our data comes from an external AI
 * over the network, we have zero compile-time guarantees and must validate
 * every field manually.
 *
 * Validation philosophy:
 *   - REQUIRED fields (progression, scale, mode) → throw if invalid
 *   - OPTIONAL-ish fields (bpm, mood_tags, explanation) → use safe fallbacks
 *     so the app still works even if the AI omits something
 *
 * @param data - The parsed (but unverified) object from JSON.parse()
 * @returns A validated ChordData object
 * @throws Error with a descriptive message if required fields are invalid
 */
export function validateChordData(data: unknown): ChordData {
  // Cast to a generic record so we can inspect individual fields.
  // This doesn't validate anything — it just lets TypeScript stop complaining
  // about indexing into `unknown`.
  const d = data as Record<string, unknown>;

  // --- progression (REQUIRED) ---
  // Must be a non-empty array where every element is a string.
  // If this is wrong, the entire response is useless — throw.
  if (
    !Array.isArray(d.progression) ||
    d.progression.length < 1 ||
    !d.progression.every((c: unknown) => typeof c === "string")
  ) {
    throw new Error("Invalid progression: must be a non-empty array of strings");
  }

  // --- bpm (FALLBACK-SAFE) ---
  // Should be a [min, max] tuple. But the AI sometimes returns a single number
  // like 128 instead of [120, 140]. We handle both gracefully.
  if (
    !Array.isArray(d.bpm) ||
    d.bpm.length !== 2 ||
    typeof d.bpm[0] !== "number" ||
    typeof d.bpm[1] !== "number"
  ) {
    if (typeof d.bpm === "number") {
      // AI returned a single number — wrap it into a range (±10 BPM)
      d.bpm = [d.bpm, (d.bpm as number) + 20];
    } else {
      // Completely invalid — use a safe default tempo
      d.bpm = [120, 140];
    }
  }

  // --- scale (REQUIRED) ---
  if (typeof d.scale !== "string") {
    throw new Error("Invalid scale: must be a string");
  }

  // --- mode (REQUIRED) ---
  if (typeof d.mode !== "string") {
    throw new Error("Invalid mode: must be a string");
  }

  // --- explanation (FALLBACK-SAFE) ---
  // Nice to have but not critical — default to empty string
  if (typeof d.explanation !== "string") {
    d.explanation = "";
  }

  // --- mood_tags (FALLBACK-SAFE) ---
  // Nice to have — default to empty array if missing or malformed
  if (
    !Array.isArray(d.mood_tags) ||
    !d.mood_tags.every((t: unknown) => typeof t === "string")
  ) {
    d.mood_tags = [];
  }

  return d as unknown as ChordData;
}

// Complete flow:
// ┌────────────────────────────────────────────────────────────┐
// │ 1. Build prompt    — buildPrompt(vibe)                    │
// │ 2. Call Gemini      — model.generateContent(prompt)       │
// │ 3. Extract text     — response.text()                     │
// │ 4. Clean response   — strip fences, find JSON braces      │
// │ 5. Parse JSON       — JSON.parse(cleanedString)           │
// │ 6. Validate schema  — check every field at runtime        │
// │ 7. Return           — typed ChordData object              │
// └────────────────────────────────────────────────────────────┘

/**
 * The main exported function — call this from the API route.
 * 
 * @param vibe The user's natural-language mood description
 * @returns A validated ChordData object with chords, BPM, scale, etc.
 */
export async function generateChords(vibe: string): Promise<ChordData> {
  const client = getGeminiClient();

  // "gemini-1.5-flash" is the fast, free-tier model.
  // It's optimized for speed and works well for structured JSON output.
  const model = client.getGenerativeModel({ model: "gemini-2.5-flash" });

  // Construct the prompt with the user's vibe injected at the end
  const prompt = buildPrompt(vibe);

  // Send the prompt to Gemini and wait for the complete response.
  // We don't need streaming here — we need the full JSON in one go.
  const result = await model.generateContent(prompt);
  const response = result.response;
  const rawText = response.text();

  // Clean the raw response: remove markdown fences, extract the JSON substring
  const jsonString = cleanJsonResponse(rawText);

  // Parse the JSON string into a plain JavaScript object
  const parsed = JSON.parse(jsonString);

  // Validate every field at runtime — TypeScript can't protect us from bad AI output
  const chordData = validateChordData(parsed);

  return chordData;
}

/**
 * generateVariation(currentProgression, scale, hint?)
 *
 * Asks the AI for a VARIATION of an existing progression instead of generating
 * from a vibe string.
 *
 * WHAT WE'RE DOING
 * ----------------
 * Same pipeline as generateChords(): build prompt → call Gemini → clean
 * response → parse JSON → validate. The only difference is HOW we build the
 * prompt: we use buildVariationPrompt() which gives the model the current
 * chords and scale and asks for a modification (optionally guided by a hint
 * like "darker" or "jazzier").
 *
 * WHY REUSE THE SAME CLEAN/VALIDATE FLOW
 * --------------------------------------
 * The AI still returns a ChordData-shaped JSON. We don't need different
 * validation or parsing — we just need a different prompt. So we call
 * buildVariationPrompt(), then the same model.generateContent → cleanJsonResponse
 * → JSON.parse → validateChordData. No code duplication for the risky parts
 * (cleaning and validating).
 *
 * @param currentProgression — The chords to vary (e.g. ["Cm", "Ab", "Bb", "Gm"])
 * @param scale              — Current key (e.g. "C Minor")
 * @param hint               — Optional: "darker", "jazzier", "more minimal", etc.
 * @returns Validated ChordData for the new progression
 */
export async function generateVariation(
  currentProgression: string[],
  scale: string,
  hint?: string
): Promise<ChordData> {
  const client = getGeminiClient();
  const model = client.getGenerativeModel({ model: "gemini-2.5-flash" });

  // Build the variation-specific prompt (includes current chords + scale + hint)
  const prompt = buildVariationPrompt(currentProgression, scale, hint);

  const result = await model.generateContent(prompt);
  const response = result.response;
  const rawText = response.text();

  const jsonString = cleanJsonResponse(rawText);
  const parsed = JSON.parse(jsonString);
  const chordData = validateChordData(parsed);

  return chordData;
}
