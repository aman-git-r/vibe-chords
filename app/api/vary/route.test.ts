import { describe, expect, it, vi, beforeEach } from "vitest";
import { POST } from "./route";
import { generateVariation } from "@/lib/gemini";
import { NextRequest } from "next/server";

vi.mock("@/lib/gemini", () => ({
  generateVariation: vi.fn(),
  cleanJsonResponse: vi.fn(),
  validateChordData: vi.fn(),
}));

function nextRequest(body: unknown): NextRequest {
  return new NextRequest("http://localhost:3000/api/vary", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

const validProgression = ["Cm", "Ab", "Bb", "Gm"];
const validScale = "C Minor";

describe("POST /api/vary", () => {
  beforeEach(() => {
    vi.mocked(generateVariation).mockReset();
  });

  it("returns 400 when currentProgression is missing", async () => {
    const res = await POST(nextRequest({ scale: validScale }));
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.error).toContain("progression");
    expect(generateVariation).not.toHaveBeenCalled();
  });

  it("returns 400 when currentProgression is empty array", async () => {
    const res = await POST(nextRequest({ currentProgression: [], scale: validScale }));
    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.error).toContain("non-empty");
    expect(generateVariation).not.toHaveBeenCalled();
  });

  it("returns 400 when currentProgression contains non-strings", async () => {
    const res = await POST(
      nextRequest({ currentProgression: ["Cm", 123, "Gm"], scale: validScale })
    );
    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.error).toContain("string");
    expect(generateVariation).not.toHaveBeenCalled();
  });

  it("returns 400 when scale is missing", async () => {
    const res = await POST(nextRequest({ currentProgression: validProgression }));
    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.error).toContain("scale");
    expect(generateVariation).not.toHaveBeenCalled();
  });

  it("returns 400 when scale is empty string", async () => {
    const res = await POST(
      nextRequest({ currentProgression: validProgression, scale: "" })
    );
    expect(res.status).toBe(400);
    expect(generateVariation).not.toHaveBeenCalled();
  });

  it("returns 400 when scale is only whitespace", async () => {
    const res = await POST(
      nextRequest({ currentProgression: validProgression, scale: "   \n  " })
    );
    expect(res.status).toBe(400);
    expect(generateVariation).not.toHaveBeenCalled();
  });

  it("returns 400 when hint is not a string", async () => {
    const res = await POST(
      nextRequest({
        currentProgression: validProgression,
        scale: validScale,
        hint: 42,
      })
    );
    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.error).toContain("string");
    expect(generateVariation).not.toHaveBeenCalled();
  });

  it("returns 400 when hint exceeds 200 characters", async () => {
    const res = await POST(
      nextRequest({
        currentProgression: validProgression,
        scale: validScale,
        hint: "a".repeat(201),
      })
    );
    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.error).toContain("200");
    expect(generateVariation).not.toHaveBeenCalled();
  });

  it("returns 200 and ChordData when body is valid with hint", async () => {
    const chordData = {
      progression: ["Dm", "Bb", "C", "Am"],
      bpm: [120, 140] as [number, number],
      scale: "C Minor",
      mode: "Aeolian",
      mood_tags: ["darker"],
      explanation: "Variation with darker feel.",
    };
    vi.mocked(generateVariation).mockResolvedValue(chordData);

    const res = await POST(
      nextRequest({
        currentProgression: validProgression,
        scale: validScale,
        hint: "darker",
      })
    );
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.progression).toEqual(chordData.progression);
    expect(data.scale).toBe(chordData.scale);
    expect(generateVariation).toHaveBeenCalledWith(
      validProgression,
      validScale,
      "darker"
    );
  });

  it("returns 200 and calls generateVariation with undefined hint when hint omitted", async () => {
    const chordData = {
      progression: ["Cm", "Eb", "Ab", "Gm"],
      bpm: [100, 120] as [number, number],
      scale: "C Minor",
      mode: "Aeolian",
      mood_tags: [],
      explanation: "Creative variation.",
    };
    vi.mocked(generateVariation).mockResolvedValue(chordData);

    const res = await POST(
      nextRequest({
        currentProgression: validProgression,
        scale: validScale,
      })
    );
    expect(res.status).toBe(200);
    expect(generateVariation).toHaveBeenCalledWith(
      validProgression,
      validScale,
      undefined
    );
  });

  it("trims scale and hint before calling generateVariation", async () => {
    vi.mocked(generateVariation).mockResolvedValue({
      progression: ["Am", "F", "G", "C"],
      bpm: [100, 120] as [number, number],
      scale: "C Major",
      mode: "Ionian",
      mood_tags: [],
      explanation: "",
    });

    await POST(
      nextRequest({
        currentProgression: validProgression,
        scale: "  C Minor  ",
        hint: "  jazzier  ",
      })
    );
    expect(generateVariation).toHaveBeenCalledWith(
      validProgression,
      "C Minor",
      "jazzier"
    );
  });

  it("passes undefined hint when hint is empty string after trim", async () => {
    vi.mocked(generateVariation).mockResolvedValue({
      progression: validProgression,
      bpm: [100, 120] as [number, number],
      scale: validScale,
      mode: "Aeolian",
      mood_tags: [],
      explanation: "",
    });

    await POST(
      nextRequest({
        currentProgression: validProgression,
        scale: validScale,
        hint: "   ",
      })
    );
    expect(generateVariation).toHaveBeenCalledWith(
      validProgression,
      validScale,
      undefined
    );
  });

  it("returns 429 when Gemini rate limit is hit", async () => {
    vi.mocked(generateVariation).mockRejectedValue(
      new Error("429 Resource Exhausted")
    );
    const res = await POST(
      nextRequest({
        currentProgression: validProgression,
        scale: validScale,
      })
    );
    expect(res.status).toBe(429);
    const data = await res.json();
    expect(data.error).toContain("Too many requests");
  });

  it("returns 500 on generic failure", async () => {
    vi.mocked(generateVariation).mockRejectedValue(new Error("Network error"));
    const res = await POST(
      nextRequest({
        currentProgression: validProgression,
        scale: validScale,
      })
    );
    expect(res.status).toBe(500);
    const data = await res.json();
    expect(data.error).toContain("Failed to generate variation");
    expect(data.error).not.toContain("Network error");
  });
});
