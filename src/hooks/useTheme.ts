import { useCallback, useEffect, useState } from "react";

type Theme = "light" | "dark";

function getInitial(): Theme {
  if (typeof window === "undefined") return "light";
  const saved = window.localStorage.getItem("rr-theme");
  if (saved === "light" || saved === "dark") return saved;
  return window.matchMedia("(prefers-color-scheme: dark)").matches
    ? "dark"
    : "light";
}

export function useTheme() {
  const [theme, setTheme] = useState<Theme>(getInitial);

  useEffect(() => {
    const root = document.documentElement;
    root.classList.toggle("dark", theme === "dark");
    window.localStorage.setItem("rr-theme", theme);
  }, [theme]);

  const toggle = useCallback(
    () => setTheme((t) => (t === "dark" ? "light" : "dark")),
    [],
  );

  return { theme, isDark: theme === "dark", toggle };
}

/** Colour tokens for chart components, driven by the active theme. */
export const chartColors = {
  light: {
    grid: "#e7ebf3",
    axis: "#94a3b8",
    text: "#64748b",
    tooltipBg: "#0f172a",
    tooltipText: "#f8fafc",
    tooltipBorder: "rgba(255,255,255,0.08)",
  },
  dark: {
    grid: "#1b2333",
    axis: "#475569",
    text: "#94a3b8",
    tooltipBg: "#0b1220",
    tooltipText: "#f1f5f9",
    tooltipBorder: "rgba(255,255,255,0.10)",
  },
};
