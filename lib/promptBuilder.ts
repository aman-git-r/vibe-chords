/**
 * buildPrompt(vibe)
 *
 * Constructs the full prompt string that gets sent to Google Gemini.
 *
 * This is the most important function in the entire app — the quality of the
 * AI output depends entirely on how well we instruct the model here.
 *
 * Design decisions baked into this prompt:
 *
 * 1. "Return a JSON object ONLY" — we explicitly tell the AI not to wrap its
 *    response in markdown code fences (```json ... ```) or add explanatory prose.
 *
 * 2. We include the exact schema with field-level comments so the AI knows
 *    the expected shape and types.
 *
 * 3. SPECIFIC SONG vs VIBE: If the user names a specific song, artist, or
 *    well-known piece, we instruct the model to return the ACTUAL chord
 *    progression and key of that piece (e.g. D# Minor when that's the real key),
 *    not an invented "vibe" version. For generic mood descriptions, progressions
 *    should be musically valid for that vibe.
 *
 * 4. Scale/key accuracy: Use the true key of the piece (e.g. "D# Minor" or
 *    "Eb Minor" as the original uses — don't substitute a different key).
 *
 * 5. Standard chord notation and musically valid progressions always.
 *
 * @param vibe - The user's input: can be a vibe description or a song/artist name
 * @returns The complete prompt string ready to send to Gemini
 */
export function buildPrompt(vibe: string): string {
  return `You are a professional music theorist and producer.

IMPORTANT — two cases:
- If the user names a SPECIFIC SONG, artist, or well-known piece: return the ACTUAL chord progression and key of that piece when you know them. Use the real scale (e.g. "D# Minor" or "Eb Minor" as the original uses — do not substitute a different key). Match the real chords and BPM range of the recording. If you are unsure, say so briefly in "explanation" but still give your best guess for the real progression.
- If the user gives only a mood or vibe (no specific song): return a musically valid progression that fits that vibe.

Return a JSON object ONLY — no preamble, no explanation, no markdown code fences.
The JSON must follow this exact schema:

{
  "progression": string[],  // 4-8 chord names (e.g. "Cm", "Fmaj7", "D#m", "G#dim")
  "bpm": [number, number],  // suggested BPM range [min, max]
  "scale": string,          // actual key, e.g. "C Minor", "D# Minor", "Eb Minor"
  "mode": string,           // modal name (e.g. "Dorian", "Aeolian")
  "mood_tags": string[],    // 3-5 single words
  "explanation": string     // 1-2 sentences max
}

Use standard chord notation (sharps/flats as in the key, e.g. D#m not Ebm when key is D# minor). Ensure progressions are musically valid and, for specific songs, accurate to the original when known.

Vibe or song: "${vibe}"`;
}

/**
 * buildVariationPrompt(currentProgression, scale, hint?)
 *
 * Builds a prompt that asks the AI to vary an EXISTING progression instead of
 * generating one from scratch.
 *
 * WHAT WE'RE DOING
 * ----------------
 * When the user clicks "Vary", we don't send a new vibe — we send the current
 * chord progression and key. The AI then produces a RELATED progression (same
 * key/mood family) that changes at least some chords. The optional "hint" tells
 * the AI HOW to vary: "darker", "jazzier", "simpler", etc.
 *
 * WHY A SEPARATE PROMPT (NOT REUSING buildPrompt)
 * ------------------------------------------------
 * buildPrompt(vibe) is for free-form vibe text. The variation flow is
 * different: we give the model structured context (the current chords and
 * scale) and ask for a modification. The instructions and tone of the
 * prompt are different, so a dedicated function keeps each prompt focused
 * and easier to tune.
 *
 * We use the SAME JSON schema as buildPrompt() so the response is valid
 * ChordData and we can reuse the same validation and UI.
 *
 * @param currentProgression — Array of chord symbols, e.g. ["Cm", "Ab", "Bb", "Gm"]
 * @param scale              — Current key, e.g. "C Minor" (so the AI stays in key)
 * @param hint               — Optional direction: "darker", "jazzier", "more minimal", etc.
 *                             If omitted, we ask for "a creative variation".
 * @returns Full prompt string ready to send to Gemini
 */
export function buildVariationPrompt(
  currentProgression: string[],
  scale: string,
  hint?: string
): string {
  const variationInstruction = hint
    ? `Modify the progression to be more: ${hint.trim()}`
    : "Create a creative variation of this progression";

  // Same schema as buildPrompt() so the AI returns valid ChordData
  return `You are a professional music theorist and producer.

You are given an existing chord progression in ${scale}:
${currentProgression.join(" → ")}

${variationInstruction}

Keep it in the same or a very similar key/mood family. Change at least 2 chords so the result feels like a variation, not a copy.
Return a JSON object ONLY — no preamble, no explanation, no markdown code fences.
The JSON must follow this exact schema:

{
  "progression": string[],  // 4-8 chord names (e.g. "Cm", "Fmaj7", "D#m", "G#dim")
  "bpm": [number, number],  // suggested BPM range [min, max]
  "scale": string,          // same or similar key, e.g. "C Minor"
  "mode": string,           // modal name (e.g. "Dorian", "Aeolian")
  "mood_tags": string[],   // 3-5 single words
  "explanation": string     // 1-2 sentences max
}

Use standard chord notation. Ensure the new progression is musically valid and clearly a variation of the original.

Vibe: "variation of ${currentProgression.join(" - ")}"`;
}
