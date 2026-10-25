import { useEffect, useState } from "react";

// Light or dark, chosen by the viewer and remembered. Until they choose, it
// follows the system. index.html applies it before first paint.

export type Theme = "light" | "dark";

const KEY = "cadence.theme";
const CHANGE = "cadence:theme";

export function getTheme(): Theme {
  return document.documentElement.dataset.theme === "dark" ? "dark" : "light";
}

export function setTheme(theme: Theme) {
  document.documentElement.dataset.theme = theme;
  try {
    localStorage.setItem(KEY, theme);
  } catch {}
  dispatchEvent(new Event(CHANGE));
}

export function useTheme(): Theme {
  const [theme, set] = useState(getTheme);
  useEffect(() => {
    const update = () => set(getTheme());
    // No choice saved yet: keep following the system.
    const system = matchMedia("(prefers-color-scheme: dark)");
    const follow = (e: MediaQueryListEvent) => {
      let saved: string | null = null;
      try {
        saved = localStorage.getItem(KEY);
      } catch {}
      if (saved) return;
      document.documentElement.dataset.theme = e.matches ? "dark" : "light";
      update();
    };
    addEventListener(CHANGE, update);
    system.addEventListener("change", follow);
    return () => {
      removeEventListener(CHANGE, update);
      system.removeEventListener("change", follow);
    };
  }, []);
  return theme;
}

/** A theme token's current value, for canvas drawing. */
export function token(name: string): string {
  return getComputedStyle(document.documentElement).getPropertyValue(name).trim();
}
