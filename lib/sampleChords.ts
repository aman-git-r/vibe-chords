import type { ChordData } from "@/types/chord";

/**
 * Predefined chord progressions that can be loaded without calling the Gemini API.
 * Use "Try sample" in the UI to load one of these when you're out of API quota
 * or want to test the app without hitting the backend.
 */
export const SAMPLE_CHORDS: ChordData[] = [
  {
    progression: [
      "Cm9",
      "Fm11",
      "Abmaj7#11",
      "Dm7b5",
      "G7b9",
      "Cm9",
    ],
    bpm: [60, 75],
    scale: "C Minor",
    mode: "Aeolian",
    mood_tags: ["Melancholy", "Reflective", "Somber", "Introspective"],
    explanation:
      "A slow minor progression featuring jazz extensions like 9ths and 11ths to create a rich, somber, and reflective sound, emphasizing melodic movement and emotional depth.",
  },
  {
    progression: ["Am", "F", "C", "G"],
    bpm: [85, 95],
    scale: "C Major",
    mode: "Ionian",
    mood_tags: ["Calm", "Acoustic", "Folk", "Warm"],
    explanation:
      "Classic I–vi–IV–V in A minor key area; works well for singer-songwriter or acoustic vibes.",
  },
  {
    progression: ["Dm", "Bb", "C", "Am"],
    bpm: [90, 110],
    scale: "D Minor",
    mode: "Aeolian",
    mood_tags: ["Lofi", "Chill", "Nostalgic", "Relaxed"],
    explanation:
      "A simple minor progression often used in lofi and chill beats.",
  },
];
