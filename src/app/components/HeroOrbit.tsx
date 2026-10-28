import { useEffect, useRef, useState } from "react";
import { reducedMotion } from "../../shared/motion";
import { Mark } from "./ui";

// The hero's orbit in glass. The 3D scene loads after the page, rises in
// once its first frame is drawn, and falls back to the plain mark when
// WebGL isn't there.

function webgl(): boolean {
  try {
    return !!document.createElement("canvas").getContext("webgl2");
  } catch {
    return false;
  }
}

export function HeroOrbit() {
  const host = useRef<HTMLDivElement>(null);
  const [fallback, setFallback] = useState(() => !webgl());
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (fallback) return;
    let gone = false;
    let orbit: { dispose(): void } | undefined;
    import("./orbitScene")
      .then(({ mountOrbit }) => {
        if (gone) return;
        orbit = mountOrbit(host.current!, { still: reducedMotion(), onReady: () => setReady(true) });
      })
      .catch(() => setFallback(true));
    return () => { gone = true; orbit?.dispose(); };
  }, [fallback]);

  return (
    <div ref={host} className="orbit-3d" data-ready={ready || undefined} data-fallback={fallback || undefined} aria-hidden="true">
      {fallback && <Mark size={160} />}
    </div>
  );
}
