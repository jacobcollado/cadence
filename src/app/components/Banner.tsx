import { useState } from "react";
import { Icon } from "./ui";

const KEY = "cadence.banner";
const REPO = "https://github.com/jacobcollado/cadence";

/** A slim note across the top: an early build, a personal ask, dismissible for good. */
export function Banner() {
  const [shown, setShown] = useState(() => {
    try {
      return localStorage.getItem(KEY) !== "closed";
    } catch {
      return true;
    }
  });
  if (!shown) return null;
  const close = () => {
    setShown(false);
    try {
      localStorage.setItem(KEY, "closed");
    } catch {}
  };
  return (
    <div className="banner" role="note">
      <p>
        Cadence is an early build by <span className="banner-sign">Jacob</span>. I'd love your{" "}
        <a href={`${REPO}/issues`} target="_blank" rel="noopener">feedback</a>, and a{" "}
        <a href={REPO} target="_blank" rel="noopener">star</a> if you like it.
      </p>
      <button className="banner-close" aria-label="Dismiss" onClick={close}><Icon name="close" size={14} /></button>
    </div>
  );
}
