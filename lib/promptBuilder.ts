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
 *    This makes parsing on our side much more reliable.
 *
 * 2. We include the exact schema with field-level comments — the AI sees the
 *    expected shape, types, and example values so it knows what to produce.
 *
 * 3. "Use standard chord notation" — prevents the AI from returning verbose
 *    names like "C minor seventh" instead of "Cm7".
 *
 * 4. "Ensure progressions are musically valid" — nudges the model to apply
 *    actual music theory (diatonic chords, common progressions) rather than
 *    generating random chord names.
 *
 * 5. The user's vibe text is injected at the END of the prompt, after all
 *    instructions. This way the model has full context about the output format
 *    before it encounters the creative input.
 *
 * @param vibe - The user's natural language description, e.g. "sad lofi, rainy"
 * @returns The complete prompt string ready to send to Gemini
 */
export function buildPrompt(vibe: string): string {
  return `You are a professional music theorist and producer. Given a vibe description,
return a JSON object ONLY — no preamble, no explanation, no markdown code fences.
The JSON must follow this exact schema:

{
  "progression": string[],  // 4-8 chord names (e.g. "Cm", "Fmaj7", "G#dim")
  "bpm": [number, number],  // suggested BPM range [min, max]
  "scale": string,          // root + scale type (e.g. "C Minor")
  "mode": string,           // modal name (e.g. "Dorian", "Aeolian")
  "mood_tags": string[],    // 3-5 single words
  "explanation": string     // 1-2 sentences max
}

Use standard chord notation. Ensure progressions are musically valid for the vibe.

Vibe: "${vibe}"`;
}
