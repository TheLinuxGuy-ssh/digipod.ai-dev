"use client";
import React, { createContext, useContext, useEffect, useState } from "react";

type Theme = "light" | "dark";
type ThemeContextType = {
  theme: Theme;
  setTheme: (theme: Theme) => void;
  toggleTheme: () => void;
};

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export const ThemeProvider = ({ children }: { children: React.ReactNode }) => {
  const [theme, setThemeState] = useState<Theme>("light");

  // On mount, initialize theme from localStorage or system preference
  useEffect(() => {
    const stored = localStorage.getItem("digipod-theme");
    if (stored === "dark" || (!stored && window.matchMedia("(prefers-color-scheme: dark)").matches)) {
      setThemeState("dark");
    } else {
      setThemeState("light");
    }
  }, []);

  // Whenever theme changes, update <html> class and localStorage
  useEffect(() => {
    if (theme === "dark") {
      document.documentElement.classList.add("dark");
      localStorage.setItem("digipod-theme", "dark");
    } else {
      document.documentElement.classList.remove("dark");
      localStorage.setItem("digipod-theme", "light");
    }
  }, [theme]);

  const setTheme = (theme: Theme) => setThemeState(theme);
  const toggleTheme = () => setThemeState(theme === "dark" ? "light" : "dark");

  return (
    <ThemeContext.Provider value={{ theme, setTheme, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error("useTheme must be used within a ThemeProvider");
  return ctx;
}; 