import { useState } from "react";
import { Icon } from "./ui";

const KEY = "cadence.banner";
const REPO = "https://github.com/jacobcollado/cadence";

/** Early-build note across the top. Closing it hides it for good. */
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
      <p className="banner-long">
        Cadence is an early build. I'd love your{" "}
        <a href={`${REPO}/issues`} target="_blank" rel="noopener">feedback</a>, and a{" "}
        <a href={REPO} target="_blank" rel="noopener">star</a> if you like it.
      </p>
      {/* Phones: the same note, short enough for one line. */}
      <p className="banner-short">
        Early build.{" "}
        <a href={`${REPO}/issues`} target="_blank" rel="noopener">Feedback</a> and{" "}
        <a href={REPO} target="_blank" rel="noopener">stars</a> welcome.
      </p>
      <button className="banner-close" aria-label="Dismiss" onClick={close}><Icon name="close" size={14} /></button>
    </div>
  );
}
