import type { Metadata } from "next";
import { cookies } from "next/headers";
import { Geist, Geist_Mono, Dancing_Script } from "next/font/google";
import "./globals.css";
import { ThemeProvider } from "@/components/ThemeProvider";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const dancingScript = Dancing_Script({
  variable: "--font-dancing-script",
  subsets: ["latin"],
  weight: ["700"],
});

export const metadata: Metadata = {
  title: "VibeChords — AI Chord Progression Generator",
  description:
    "Describe a vibe, get a musically valid chord progression with browser playback and MIDI export.",
};

const themeScript = `
  try {
    var t = localStorage.getItem('theme');
    var preferDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    var isDark = t === 'dark' || (!t && preferDark);
    document.documentElement.classList.toggle('dark', isDark);
    document.cookie = 'theme=' + (isDark ? 'dark' : 'light') + '; path=/; max-age=31536000';
  } catch(e){}
`;

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const cookieStore = await cookies();
  const themeCookie = cookieStore.get("theme")?.value;
  const isDark = themeCookie === "dark" || (!themeCookie && false);

  return (
    <html lang="en" className={isDark ? "dark" : ""} suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body
        className={`${geistSans.variable} ${geistMono.variable} ${dancingScript.variable} antialiased`}
      >
        <ThemeProvider initialTheme={isDark ? "dark" : "light"}>
          {children}
        </ThemeProvider>
      </body>
    </html>
  );
}
