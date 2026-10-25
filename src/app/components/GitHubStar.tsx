import { useEffect, useState } from "react";

const REPO = "jacobcollado/cadence";
const KEY = "cadence.stars";

/** Star count from GitHub, cached for the session. Null until known, or while the repo is private. */
function useStars(): number | null {
  const [stars, setStars] = useState<number | null>(() => {
    try {
      const v = sessionStorage.getItem(KEY);
      return v === null ? null : Number(v);
    } catch {
      return null;
    }
  });
  useEffect(() => {
    if (stars !== null) return;
    let live = true;
    fetch(`https://api.github.com/repos/${REPO}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (!live || typeof d?.stargazers_count !== "number") return;
        setStars(d.stargazers_count);
        try {
          sessionStorage.setItem(KEY, String(d.stargazers_count));
        } catch {}
      })
      .catch(() => {});
    return () => {
      live = false;
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps
  return stars;
}

function format(n: number): string {
  return n >= 1000 ? `${+(n / 1000).toFixed(1)}k` : String(n);
}

/** Link to the repo with its star count. `compact` shows only the GitHub mark. */
export function GitHubStar({ compact = false }: { compact?: boolean }) {
  const stars = useStars();
  return (
    <a className="gh-star" data-compact={compact || undefined} title={compact ? "Star on GitHub" : undefined} href={`https://github.com/${REPO}`} target="_blank" rel="noopener" aria-label={stars === null ? "Star Cadence on GitHub" : `Star Cadence on GitHub, ${stars} stars`}>
      <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor" aria-hidden="true">
        <path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.013 8.013 0 0016 8c0-4.42-3.58-8-8-8z" />
      </svg>
      {!compact && <span>Star</span>}
      {!compact && stars !== null && <span className="gh-count num">{format(stars)}</span>}
    </a>
  );
}
