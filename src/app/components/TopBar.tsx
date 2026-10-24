import type { ReactNode } from "react";
import { navigate } from "../lib";
import { Icon, Mark } from "./ui";

export function TopBar({ back, children }: { back?: boolean; children?: ReactNode }) {
  const home = (e: React.MouseEvent) => {
    e.preventDefault();
    navigate("/");
  };
  return (
    <div className="topbar">
      {back ? (
        <a href="/" className="tag-btn" onClick={home}>
          <Icon name="back" size={14} />Runs
        </a>
      ) : (
        <a href="/" className="brand" onClick={home}>
          <Mark />Cadence
        </a>
      )}
      <span className="spacer" />
      {children}
    </div>
  );
}
