import type { CauseKind } from "./stats";

// What to do about each cause. Each tip names the change, then why it helps.

export interface Tip {
  title: string;
  detail: string;
}

export const CAUSE_LABEL: Record<CauseKind, string> = {
  script: "Scripts",
  layout: "Style and layout",
  drawing: "Drawing",
  steady: "Steady work",
  unknown: "Not traced",
};

export const ADVICE: Record<CauseKind, Tip[]> = {
  script: [
    {
      title: "Break up long tasks",
      detail: "Split the work into pieces under 50 ms and yield between them, with `scheduler.yield()` or `setTimeout`, so the browser can draw in between.",
    },
    {
      title: "Run it later, or only when needed",
      detail: "Defer work that isn't urgent with `requestIdleCallback`, and start a section's scripts when it nears the screen with an `IntersectionObserver`.",
    },
    {
      title: "Move heavy work off the main thread",
      detail: "Parsing, sorting and number crunching can run in a Web Worker, which never blocks scrolling.",
    },
  ],
  layout: [
    {
      title: "Don't read layout right after changing it",
      detail: "Reading sizes like `offsetHeight` or `getBoundingClientRect` after a style change forces a full layout. Do all reads first, then all writes.",
    },
    {
      title: "Animate transform and opacity",
      detail: "Animating width, height, top or left reruns layout every frame. Transform and opacity skip it.",
    },
    {
      title: "Let the browser skip what's off screen",
      detail: "`content-visibility: auto` on long sections tells the browser not to lay them out until they're close to view.",
    },
  ],
  drawing: [
    {
      title: "Ease off expensive effects",
      detail: "Large blur filters, `backdrop-filter` and big shadows are costly to redraw while scrolling. Use them on smaller areas, or fake them with an image.",
    },
    {
      title: "Size images to how they're shown",
      detail: "Serve images no larger than their displayed size, in WebP or AVIF, with `decoding=\"async\"` so decoding doesn't hold up a frame.",
    },
    {
      title: "Cap canvas and WebGL work",
      detail: "Limit the drawing resolution to 2x on phones, and pause rendering when the canvas is off screen.",
    },
  ],
  steady: [
    {
      title: "Look for work on every frame",
      detail: "Scroll listeners, parallax and smooth-scroll libraries run constantly. Keep each handler small and tie it to `requestAnimationFrame`.",
    },
    {
      title: "Make scroll listeners passive",
      detail: "Add `{ passive: true }` so the browser never waits on your handler before it scrolls.",
    },
    {
      title: "Animate transform and opacity",
      detail: "They can run without the main thread, so they stay smooth even when your scripts are busy.",
    },
  ],
  unknown: [
    {
      title: "Run the same pass in a Chromium browser",
      detail: "Chrome, Edge, Arc, Dia, Helium and other Chromium browsers report which script was running during each freeze, so the report can name the cause and the fix.",
    },
    {
      title: "Start with the slowest section",
      detail: "The sections table shows where frames dropped. That section's code is the best place to look first.",
    },
  ],
};

/** A tip for a slow scroll handler, from what this run actually measured. */
export function scrollTip(name: string, count: number, total: number): Tip {
  return {
    title: "Lighten the scroll handler",
    detail: `\`${name}\` ran ${count === 1 ? "once" : `${count} times`} for ${Math.round(total).toLocaleString()} ms in all. Do only what each frame needs in it: read positions once per frame inside \`requestAnimationFrame\`, and make the listener passive.`,
  };
}
