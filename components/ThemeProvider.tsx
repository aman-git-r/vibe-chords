"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";

type Theme = "light" | "dark";

const ThemeContext = createContext<{
  theme: Theme;
  setTheme: (theme: Theme) => void;
} | null>(null);

export function ThemeProvider({
  children,
  initialTheme = "light",
}: {
  children: React.ReactNode;
  initialTheme?: Theme;
}) {
  const [theme, setThemeState] = useState<Theme>(initialTheme);

  const setTheme = useCallback((next: Theme) => {
    setThemeState(next);
    const isDark = next === "dark";
    document.documentElement.classList.toggle("dark", isDark);
    try {
      localStorage.setItem("theme", next);
      document.cookie = `theme=${next}; path=/; max-age=31536000`;
    } catch {}
  }, []);

  useEffect(() => {
    const isDark = theme === "dark";
    document.documentElement.classList.toggle("dark", isDark);
  }, [theme]);

  return (
    <ThemeContext.Provider value={{ theme, setTheme }}>
      <div className={theme === "dark" ? "dark" : ""}>{children}</div>
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error("useTheme must be used within ThemeProvider");
  return ctx;
}
