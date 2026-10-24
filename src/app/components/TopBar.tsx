import type { ReactNode } from "react";
import { navigate } from "../lib";
import { setTheme, useTheme } from "../theme";
import { Icon, Wordmark } from "./ui";

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
        <a href="/" className="tag-btn" onClick={home}>
          <Icon name="back" size={14} />Runs
        </a>
      ) : (
        <a href="/" className="brand" onClick={home} aria-label="Cadence, home">
          <Wordmark height={28} />
        </a>
      )}
      <span className="spacer" />
      {children}
      <button className="icon-btn theme-btn" aria-label={`Switch to ${next} theme`} title={`Switch to ${next} theme`} onClick={() => setTheme(next)}>
        <span className="theme-icon" key={theme}><Icon name={theme === "dark" ? "sun" : "moon"} /></span>
      </button>
    </div>
  );
}
