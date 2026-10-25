import type { ReactNode } from "react";
import { navigate } from "../lib";
import { setTheme, useTheme } from "../theme";
import { Icon, Mark } from "./ui";
import { GitHubStar } from "./GitHubStar";

/** The logo, which is also the way home. */
export function Brand() {
  return (
    <a href="/" className="brand" aria-label="Cadence, home" onClick={(e) => { e.preventDefault(); navigate("/"); }}>
      <Mark /><span className="brand-word">cadence</span>
    </a>
  );
}

export function ThemeToggle() {
  const theme = useTheme();
  const next = theme === "dark" ? "light" : "dark";
  return (
    <button className="theme-btn" aria-label={`Switch to ${next} theme`} title={`Switch to ${next} theme`} onClick={() => setTheme(next)}>
      <span className="theme-icon" key={theme}><Icon name={theme === "dark" ? "sun" : "moon"} /></span>
    </button>
  );
}

export function TopBar({ children }: { children?: ReactNode }) {
  return (
    <div className="topbar">
      <Brand />
      <span className="spacer" />
      {children}
      <a href="/docs" className="topbar-link" onClick={(e) => { e.preventDefault(); navigate("/docs"); }}>Docs</a>
      <GitHubStar />
      <ThemeToggle />
    </div>
  );
}
