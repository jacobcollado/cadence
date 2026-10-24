import type { ReactNode } from "react";
import { navigate } from "../lib";
import { setTheme, useTheme } from "../theme";
import { Icon, Mark } from "./ui";

export function TopBar({ back, children }: { back?: boolean; children?: ReactNode }) {
  const theme = useTheme();
  const home = (e: React.MouseEvent) => {
    e.preventDefault();
    navigate("/");
  };
  const next = theme === "dark" ? "light" : "dark";
  return (
    <div className="topbar">
      {back ? (
        <a href="/" className="back-link" onClick={home}>
          {/* The chevron's box is trimmed to its ink, so it starts on the content edge. */}
          <svg width="6" height="10.5" viewBox="4.75 1.25 6 10.5" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M10 2L5.5 6.5L10 11" />
          </svg>
          Runs
        </a>
      ) : (
        <a href="/" className="brand" onClick={home}>
          <Mark /><span className="brand-word">cadence</span>
        </a>
      )}
      <span className="spacer" />
      {children}
      <button className="theme-btn" aria-label={`Switch to ${next} theme`} title={`Switch to ${next} theme`} onClick={() => setTheme(next)}>
        <span className="theme-icon" key={theme}><Icon name={theme === "dark" ? "sun" : "moon"} /></span>
      </button>
    </div>
  );
}
