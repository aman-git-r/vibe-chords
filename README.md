# VibeChords

**AI-powered chord progression generator.** Describe a mood or vibe in plain text and get a musically valid chord progression with in-browser playback.

![Next.js](https://img.shields.io/badge/Next.js-16-black?style=flat-square&logo=next.js)
![TypeScript](https://img.shields.io/badge/TypeScript-5-blue?style=flat-square&logo=typescript)
![Tailwind CSS](https://img.shields.io/badge/Tailwind-4-38bdf8?style=flat-square&logo=tailwindcss)
![Google Gemini](https://img.shields.io/badge/Gemini-AI-4285F4?style=flat-square&logo=google)

**Live demo: [vibe-chords.amanrwt.com](https://vibe-chords.amanrwt.com)**

---

## What it does

- **Vibe → Chords:** Type a description like *"dark trap beat, minor, aggressive"* or *"sunny beach acoustic"* and hit Generate.
- **AI generation:** Uses [Google Gemini](https://ai.google.dev/) to return a structured chord progression (4–8 chords), suggested BPM, scale/mode, mood tags, and a short explanation.
- **Conversational variations:** After generating, follow up with requests like *"make it darker"* or *"add jazz flavor"* — the AI modifies the existing progression.
- **Playback:** Chords play in the browser via [Tone.js](https://tonejs.github.io/) with adjustable BPM and octave.
- **Export:** Download the progression as a MIDI file for use in your DAW (FL Studio, Ableton, Logic, etc.).
- **Dark / light theme:** Toggle between dark and light mode, with system preference detection.
- **History panel:** Browse and revisit all progressions generated during a session.
- **Quick prompts & samples:** Get started instantly with suggested prompts or pre-built sample progressions (no API key needed).

No music theory required — just describe the feeling you want.

---

## Screenshot

The app opens with an animated splash screen, then presents a conversational interface:

- **Splash screen** with the VibeChords logo and a "Get Started" button
- **Quick prompts** (e.g. *Dreamy lo-fi sunset*) and **sample progressions** on the landing view
- **Chord cards** (e.g. **Cm**, **Ab**, **Bb**, **Gm**) displayed after generation
- **Scale and mode** (e.g. **C Minor — Aeolian**)
- **Mood tags** (e.g. dark, aggressive, tense)
- A short **explanation** of why the progression fits the vibe
- **Play/Pause**, **BPM slider**, **octave control**, and **MIDI export**
- **History panel** (right sidebar) to revisit past progressions
- **Dark / light mode** toggle in the header

---

## Prerequisites

- **Node.js** 18 or newer
- **npm** (or yarn / pnpm)
- A **Google AI (Gemini) API key** — free at [Google AI Studio](https://aistudio.google.com)

---

## Quick start

### 1. Clone and install

```bash
git clone https://github.com/your-username/vibe-chords.git
cd vibe-chords
npm install
```

### 2. Set your Gemini API key

Create a file named `.env.local` in the project root:

```env
GEMINI_API_KEY=your_api_key_here
```

Get a key at [aistudio.google.com](https://aistudio.google.com) → **Get API key** → Create key, then paste it here. **Do not commit this file** (it's in `.gitignore`).

### 3. Run the dev server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

### 4. Use the app

1. Click **Get Started** on the splash screen.
2. Type a vibe (e.g. *"chill lofi hip hop"*) or pick a **quick prompt**.
3. Click **Send** to generate.
4. Use **Play** to hear the progression; adjust **BPM** and **Octave** if you like.
5. Send a follow-up (e.g. *"make it jazzier"*) to get a **variation** of the current progression.
6. Use **Export MIDI** to download a `.mid` file for your DAW.
7. Browse the **History** panel on the right to revisit earlier progressions.

---

## Project structure

```
vibe-chords/
├── app/
│   ├── page.tsx              # Main UI (conversational vibe input, chord display, controls)
│   ├── layout.tsx            # Root layout, metadata, and theme setup
│   ├── globals.css           # Global styles (dark/light theme variables)
│   └── api/
│       ├── generate/
│       │   └── route.ts      # POST /api/generate → Gemini AI (new progression)
│       └── vary/
│           └── route.ts      # POST /api/vary → Gemini AI (variation of existing)
├── components/
│   ├── SplashScreen.tsx      # Animated landing screen with musical note wallpaper
│   ├── VibeChordsLogo.tsx    # Logo component (Rochester font)
│   ├── ThemeProvider.tsx     # Dark/light theme context provider
│   ├── ThemeToggle.tsx       # Sun/moon theme toggle button
│   ├── HistoryPanel.tsx      # Right sidebar listing past generated progressions
│   ├── ChordCard.tsx         # Single chord display card
│   ├── ChordPlayer.tsx       # Tone.js playback, BPM slider, octave control
│   ├── ExportButton.tsx      # MIDI export button
│   ├── VibeInput.tsx         # Text input component
│   └── ui/                   # shadcn/ui components (card, button, badge, slider, etc.)
├── lib/
│   ├── gemini.ts             # Gemini API client, response validation, variation support
│   ├── promptBuilder.ts      # Builds AI prompts for chord generation and variation
│   ├── chordToNotes.ts       # Maps chord names to MIDI notes
│   ├── midiExport.ts         # Client-side MIDI file generation and download
│   ├── sampleChords.ts       # Sample progressions for demos/fallback
│   └── utils.ts              # Shared utilities (e.g. cn)
├── types/
│   ├── chord.ts              # ChordData interface
│   └── midi-writer-js.d.ts   # Type declarations for midi-writer-js
├── docs/
│   ├── prd.md                # Product requirements and architecture
│   └── design-system.md      # Colors, fonts, spacing, component tokens
├── vitest.config.mts         # Vitest config (path aliases, jsdom)
├── netlify.toml              # Netlify build config (Next.js)
└── package.json
```

---

## Tech stack

| Layer        | Technology              | Purpose                            |
|-------------|-------------------------|------------------------------------|
| Framework   | Next.js 16 (App Router) | SSR, API routes, React frontend   |
| Styling     | Tailwind CSS 4          | Utility-first CSS                  |
| UI          | shadcn/ui, Radix        | Accessible components              |
| AI          | Google Gemini 1.5 Flash | Chord generation from vibe text    |
| Audio       | Tone.js                 | Browser synth and sequencing       |
| MIDI Export | midi-writer-js          | Client-side .mid file generation   |
| Icons       | Lucide React            | Icon library                       |
| Language    | TypeScript              | Type-safe ChordData and APIs       |

---

## API

### `POST /api/generate`

Generate a new chord progression from a vibe description.

**Request body:**

```json
{ "vibe": "dark trap beat, minor, aggressive" }
```

**Response (success):**

```json
{
  "progression": ["Cm", "Ab", "Bb", "Gm"],
  "bpm": [140, 160],
  "scale": "C Minor",
  "mode": "Aeolian",
  "mood_tags": ["dark", "aggressive", "tense", "driving"],
  "explanation": "Minor chords with flat VI and VII create a heavy, unresolved tension common in trap."
}
```

### `POST /api/vary`

Generate a variation of an existing chord progression.

**Request body:**

```json
{
  "currentProgression": ["Cm", "Ab", "Bb", "Gm"],
  "scale": "C Minor",
  "hint": "make it jazzier"
}
```

**Response:** Same `ChordData` shape as `/api/generate`.

The `ChordData` type in `types/chord.ts` is the single source of truth for this shape.

---

## Testing

Unit and API tests use [Vitest](https://vitest.dev/) and React Testing Library.

```bash
npm run test        # watch mode
npm run test:run    # single run (e.g. for CI)
```

Tests cover:

- **lib/chordToNotes.ts** — chord symbol → note arrays (major, minor, 7ths, sharps/flats)
- **lib/promptBuilder.ts** — prompt construction for vibe and variation
- **lib/gemini.ts** — JSON cleaning (markdown fences, prose) and ChordData validation
- **app/api/generate/route.ts** — input validation, 400/429/500 responses, success path (with mocked Gemini)

---

## Deployment (Netlify)

The live site is deployed at **[vibe-chords.amanrwt.com](https://vibe-chords.amanrwt.com)**. To deploy your own instance:

1. Push the repo to GitHub (or your Git host).
2. Go to [netlify.com](https://www.netlify.com) → **Add new site** → **Import an existing project** → connect your repo.
3. Netlify will detect Next.js and use the build settings from `netlify.toml` (build command: `npm run build`).
4. In **Site configuration** → **Environment variables**, add:
   - **Key:** `GEMINI_API_KEY`
   - **Value:** your Gemini API key (get one at [aistudio.google.com](https://aistudio.google.com))
5. Deploy. VibeChords will be live at `https://your-site-name.netlify.app`.

No `.env.local` on the server — the app uses Netlify's environment variables.

---

## Configuration

- **Vibe length:** Input is limited to 200 characters; validated on both client and server.
- **BPM range:** Playback allows 60–180 BPM; defaults from the AI's suggested range.
- **Rate limits:** Gemini free tier has daily limits; the app shows a message if you hit them.

---

## License

This project is licensed under the **MIT License** — see [LICENSE](LICENSE) for details.

---

## Contributing

1. Fork the repo.
2. Create a branch (`git checkout -b feature/your-feature`).
3. Commit your changes (`git commit -m 'Add some feature'`).
4. Push to the branch (`git push origin feature/your-feature`).
5. Open a Pull Request.
