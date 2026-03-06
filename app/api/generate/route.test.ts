import { describe, expect, it, vi, beforeEach } from "vitest";
import { POST } from "./route";
import { generateChords } from "@/lib/gemini";
import { NextRequest } from "next/server";

vi.mock("@/lib/gemini", () => ({
  generateChords: vi.fn(),
  cleanJsonResponse: vi.fn(),
  validateChordData: vi.fn(),
}));

function nextRequest(body: unknown): NextRequest {
  return new NextRequest("http://localhost:3000/api/generate", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

describe("POST /api/generate", () => {
  beforeEach(() => {
    vi.mocked(generateChords).mockReset();
  });

  it("returns 400 when vibe is missing", async () => {
    const res = await POST(nextRequest({}));
    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.error).toContain("vibe");
    expect(generateChords).not.toHaveBeenCalled();
  });

  it("returns 400 when vibe is empty string", async () => {
    const res = await POST(nextRequest({ vibe: "" }));
    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.error).toBeDefined();
    expect(generateChords).not.toHaveBeenCalled();
  });

  it("returns 400 when vibe is only whitespace", async () => {
    const res = await POST(nextRequest({ vibe: "   \n  " }));
    expect(res.status).toBe(400);
    expect(generateChords).not.toHaveBeenCalled();
  });

  it("returns 400 when vibe exceeds 200 characters", async () => {
    const res = await POST(nextRequest({ vibe: "a".repeat(201) }));
    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.error).toContain("200");
    expect(generateChords).not.toHaveBeenCalled();
  });

  it("returns 200 and ChordData when vibe is valid", async () => {
    const chordData = {
      progression: ["Cm", "Ab", "Bb", "Gm"],
      bpm: [140, 160] as [number, number],
      scale: "C Minor",
      mode: "Aeolian",
      mood_tags: ["dark", "tense"],
      explanation: "Minor progression.",
    };
    vi.mocked(generateChords).mockResolvedValue(chordData);

    const res = await POST(nextRequest({ vibe: "dark trap" }));
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.progression).toEqual(chordData.progression);
    expect(data.bpm).toEqual(chordData.bpm);
    expect(data.scale).toBe(chordData.scale);
    expect(generateChords).toHaveBeenCalledWith("dark trap");
  });

  it("trims vibe before calling generateChords", async () => {
    vi.mocked(generateChords).mockResolvedValue({
      progression: ["Am", "F", "G", "C"],
      bpm: [100, 120] as [number, number],
      scale: "C Major",
      mode: "Ionian",
      mood_tags: [],
      explanation: "",
    });

    await POST(nextRequest({ vibe: "  chill lofi  " }));
    expect(generateChords).toHaveBeenCalledWith("chill lofi");
  });

  it("returns 429 when Gemini rate limit is hit", async () => {
    vi.mocked(generateChords).mockRejectedValue(new Error("429 Resource Exhausted"));
    const res = await POST(nextRequest({ vibe: "jazz" }));
    expect(res.status).toBe(429);
    const data = await res.json();
    expect(data.error).toContain("Too many requests");
  });

  it("returns 500 on generic AI failure", async () => {
    vi.mocked(generateChords).mockRejectedValue(new Error("Network error"));
    const res = await POST(nextRequest({ vibe: "happy pop" }));
    expect(res.status).toBe(500);
    const data = await res.json();
    expect(data.error).toContain("Failed to generate");
    expect(data.error).not.toContain("Network error");
  });
});
