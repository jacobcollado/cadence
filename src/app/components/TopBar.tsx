import type { ReactNode } from "react";
import { navigate } from "../lib";
import { setTheme, useTheme } from "../theme";
import { Icon, Mark } from "./ui";
import { GitHubStar } from "./GitHubStar";

export function TopBar({ children }: { children?: ReactNode }) {
  const theme = useTheme();
  const home = (e: React.MouseEvent) => {
    e.preventDefault();
    navigate("/");
  };
  const next = theme === "dark" ? "light" : "dark";
  return (
    <div className="topbar">
      <a href="/" className="brand" onClick={home} aria-label="Cadence, home">
        <Mark /><span className="brand-word">cadence</span>
      </a>
      <span className="spacer" />
      {children}
      <a href="/docs" className="topbar-link" aria-current={location.pathname.startsWith("/docs") ? "page" : undefined} onClick={(e) => { e.preventDefault(); navigate("/docs"); }}>Docs</a>
      <GitHubStar />
      <button className="theme-btn" aria-label={`Switch to ${next} theme`} title={`Switch to ${next} theme`} onClick={() => setTheme(next)}>
        <span className="theme-icon" key={theme}><Icon name={theme === "dark" ? "sun" : "moon"} /></span>
      </button>
    </div>
  );
}
