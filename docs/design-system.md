# VibeChords Design System

Reference for every visual decision in the app — colors, typography, spacing, components, and theming.

---

## Color System

All colors use the **OKLCH** color space for perceptual uniformity. Tokens are defined as CSS custom properties in `app/globals.css` and mapped to Tailwind utilities via `@theme inline`.

### Light Theme (default)

| Token                | OKLCH Value               | Usage                                |
|----------------------|---------------------------|--------------------------------------|
| `--background`       | `oklch(0.98 0.003 85)`    | Page background                      |
| `--foreground`       | `oklch(0.15 0.01 55)`     | Primary text                         |
| `--card`             | `oklch(0.995 0.002 85)`   | Card surfaces                        |
| `--card-foreground`  | `oklch(0.15 0.01 55)`     | Text on cards                        |
| `--primary`          | `oklch(0.55 0.2 45)`      | Buttons, links, active states (warm amber) |
| `--primary-foreground`| `oklch(0.99 0 0)`        | Text on primary surfaces             |
| `--secondary`        | `oklch(0.95 0.006 85)`    | Secondary buttons, badge backgrounds |
| `--secondary-foreground`| `oklch(0.2 0.01 55)`   | Text on secondary surfaces           |
| `--muted`            | `oklch(0.94 0.006 85)`    | Subtle backgrounds, slider tracks    |
| `--muted-foreground` | `oklch(0.48 0.01 55)`     | Secondary text, placeholders         |
| `--accent`           | `oklch(0.95 0.006 85)`    | Hover states, accent areas           |
| `--accent-foreground`| `oklch(0.2 0.01 55)`      | Text on accent surfaces              |
| `--destructive`      | `oklch(0.577 0.245 27.3)` | Error states                         |
| `--border`           | `oklch(0.91 0.006 85)`    | Borders, dividers, scrollbar thumbs  |
| `--input`            | `oklch(0.91 0.006 85)`    | Input field borders                  |
| `--ring`             | `oklch(0.55 0.2 45)`      | Focus rings (matches primary)        |

### Dark Theme

Applied when `html` has the `.dark` class. Key overrides:

| Token                | OKLCH Value               | Notes                                |
|----------------------|---------------------------|--------------------------------------|
| `--background`       | `oklch(0.16 0.012 55)`    | Deep warm charcoal                   |
| `--foreground`       | `oklch(0.92 0.006 85)`    | Light cream text                     |
| `--card`             | `oklch(0.21 0.012 55)`    | Slightly elevated card surface       |
| `--primary`          | `oklch(0.65 0.18 50)`     | Warmer, lighter amber for contrast   |
| `--primary-foreground`| `oklch(0.13 0.01 55)`    | Dark text on primary (inverted)      |
| `--secondary`        | `oklch(0.24 0.01 55)`     | Dark secondary surface               |
| `--muted`            | `oklch(0.27 0.01 55)`     | Subtle dark backgrounds              |
| `--muted-foreground` | `oklch(0.6 0.012 65)`     | Dimmed text                          |
| `--border`           | `oklch(0.3 0.01 55)`      | Subtle dark borders                  |

### Design Philosophy

The palette is **warm and earthy** (hue ~45–85 in OKLCH), inspired by a warm, approachable aesthetic. Light mode uses near-white creams; dark mode uses deep warm charcoals. The primary accent is a **rich amber** that works as a call-to-action in both themes.

---

## Typography

### Font Stack

| CSS Variable      | Font Family      | Source        | Usage                        |
|-------------------|------------------|---------------|------------------------------|
| `--font-sans`     | Geist Sans       | Google Fonts  | Body text, UI labels, inputs |
| `--font-mono`     | Geist Mono       | Google Fonts  | Code, technical data         |
| `--font-brand`    | Rochester        | Google Fonts  | Logo ("VibeChords"), cursive italic |

Fonts are loaded via `next/font/google` in `app/layout.tsx` and injected as CSS variables (`--font-geist-sans`, `--font-geist-mono`, `--font-rochester`).

### Body

```css
body {
  font-family: var(--font-sans), system-ui, -apple-system, sans-serif;
}
```

### Scale (Tailwind defaults)

| Class       | Size    | Where it's used                          |
|-------------|---------|------------------------------------------|
| `text-xs`   | 0.75rem | Badge labels, history entry tags, helper text |
| `text-sm`   | 0.875rem| Input text, button labels, explanations  |
| `text-base` | 1rem    | Splash tagline                           |
| `text-lg`   | 1.125rem| Scale/mode heading, splash tagline (sm+) |
| `text-xl`   | 1.25rem | Chord names, header logo                 |
| `text-5xl`  | 3rem    | Splash screen logo                       |
| `text-6xl`  | 3.75rem | Splash screen logo (sm+)                 |

### Logo

The `VibeChordsLogo` component renders the brand name in Rochester (italic cursive). It accepts a `className` prop for sizing and is used in the header (`text-xl`) and splash screen (`text-5xl sm:text-6xl` with a gradient).

```
font-brand italic
```

The splash version uses a gradient text effect:

```
bg-linear-to-r from-primary to-primary/70 bg-clip-text text-transparent
```

---

## Spacing & Radius

### Border Radius

Base radius: `--radius: 0.625rem` (10px).

| Token          | Value                        | Used for               |
|----------------|------------------------------|------------------------|
| `--radius-sm`  | `calc(var(--radius) - 4px)`  | Small elements         |
| `--radius-md`  | `calc(var(--radius) - 2px)`  | Inputs, badges         |
| `--radius-lg`  | `var(--radius)` (10px)       | Cards, panels          |
| `--radius-xl`  | `calc(var(--radius) + 4px)`  | Large cards            |
| `--radius-2xl` | `calc(var(--radius) + 8px)`  | Modals, splash buttons |

Many interactive elements use `rounded-full` (pills): quick prompt buttons, badges, the splash "Get Started" button, and the input bar (`rounded-2xl`).

### Common Spacing

- **Page padding:** `px-4`
- **Card padding:** `p-4` (chord cards), `px-6` (standard cards via shadcn)
- **Gap between chord cards:** `gap-3`
- **Section gaps:** `gap-6` (main content areas), `gap-8` (landing sections)
- **History panel width:** `380px` (on `lg:` screens)
- **Max content width:** `max-w-2xl` (input bar, main content column)

---

## Components

### Button (shadcn/ui)

CVA variants from `components/ui/button.tsx`:

| Variant      | Description                                 |
|--------------|---------------------------------------------|
| `default`    | `bg-primary text-primary-foreground`        |
| `destructive`| Red background, white text                  |
| `outline`    | Bordered, transparent bg, accent on hover   |
| `secondary`  | `bg-secondary text-secondary-foreground`    |
| `ghost`      | Transparent, accent bg on hover             |
| `link`       | Underline text link style                   |

Sizes: `xs` (h-6), `sm` (h-8), `default` (h-9), `lg` (h-10), `icon` (square 36px), `icon-xs`, `icon-sm`, `icon-lg`.

### Badge (shadcn/ui)

Pill-shaped (`rounded-full`) inline labels. Used for mood tags.

| Variant      | Description                                 |
|--------------|---------------------------------------------|
| `default`    | Primary background                          |
| `secondary`  | Muted background (used for mood tags)       |
| `outline`    | Border only                                 |
| `ghost`      | Transparent, hover accent                   |

### Card (shadcn/ui)

`rounded-xl border bg-card shadow-sm`. Cards contain `CardContent` with `px-6` padding.

**Chord cards** override the default with:
- Active: `border-primary bg-primary/15 scale-105 shadow-lg shadow-primary/20`
- Inactive: `border-border bg-card/80 hover:border-muted-foreground/30`

### Input Bar

The floating bottom input uses a custom container (not a shadcn component):

```
rounded-2xl border border-input bg-background px-4 py-2.5 shadow-sm
focus-within:ring-2 focus-within:ring-ring focus-within:border-transparent
```

It floats at the bottom of the left column with `absolute bottom-0` positioning and a background fade.

---

## Theming

### How it works

1. **Server-side:** `layout.tsx` reads a `theme` cookie and sets the initial `.dark` class on `<html>`.
2. **Client-side:** An inline `<script>` runs before React hydration to read `localStorage` and `prefers-color-scheme`, toggling `.dark` immediately to prevent flash.
3. **React context:** `ThemeProvider` holds the current theme in state. `useTheme()` gives any component read/write access.
4. **Persistence:** Theme is saved to both `localStorage` and a cookie (for SSR).

### Toggle

`ThemeToggle` renders a ghost icon button (Sun/Moon from Lucide) in the header. Clicking it calls `setTheme()` from `useTheme()`.

### CSS Activation

```css
@custom-variant dark (&:where(.dark, .dark *));
```

Dark overrides live in `@layer theme` so they take precedence when `.dark` is present.

---

## Animations

### Splash Screen

Three staggered fade-up animations for the logo, tagline, and button:

```css
@keyframes splash-fade-up {
  from { opacity: 0; transform: translateY(12px); }
  to   { opacity: 1; transform: translateY(0); }
}

.animate-splash-fade-up { animation: splash-fade-up 0.5s ease-out both; }
.animation-delay-300    { animation-delay: 300ms; }
.animation-delay-500    { animation-delay: 500ms; }
```

Musical note icons are placed at fixed positions across the splash background with slight rotations for a decorative wallpaper effect.

### Chord Card Highlight

Active chord cards scale up with a primary-colored ring and shadow:

```
scale-105 shadow-lg shadow-primary/20
```

A global easing function applies to all transitions:

```css
* { transition-timing-function: cubic-bezier(0.4, 0, 0.2, 1); }
```

---

## Scrollbar

Custom styled scrollbars via the `.scrollbar-theme` class:

- **Width:** 8px
- **Track:** matches `--background`
- **Thumb:** matches `--border` (light) / `--muted` (dark)
- **Thumb hover:** matches `--muted-foreground`
- Uses `scrollbar-width: thin` and `scrollbar-gutter: stable` for Firefox

---

## Icon Library

All icons come from [Lucide React](https://lucide.dev/). Common icons used:

| Icon        | Where                        |
|-------------|------------------------------|
| `Send`      | Input submit button          |
| `Sparkles`  | Landing page hero            |
| `Loader2`   | Loading spinner (animated)   |
| `Download`  | MIDI export button           |
| `Sun` / `Moon` | Theme toggle              |
| `History`   | History panel header         |
| `Music` variants | Splash screen wallpaper |

Standard sizing: `size-4` (16px) for inline icons, larger sizes for decorative use.
