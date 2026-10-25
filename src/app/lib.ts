import { flushSync } from "react-dom";
import { decodeRun, encodeRun, type Run } from "../shared/run";
import { computeStats, type Rating } from "../shared/stats";
import { reducedMotion } from "../shared/motion";

// Routing: three pages, so a tiny history-based router is enough.

const NAV = "cadence:navigate";

export function navigate(to: string, update?: () => void) {
  const go = () => {
    history.pushState(null, "", to);
    dispatchEvent(new Event(NAV));
    update?.();
  };
  const doc = document as Document & { startViewTransition?: (cb: () => void) => unknown };
  if (doc.startViewTransition && !reducedMotion()) {
    doc.startViewTransition(() => flushSync(go));
  } else {
    go();
  }
  scrollTo({ top: 0 });
}

export function onNavigate(fn: () => void): () => void {
  addEventListener("popstate", fn);
  addEventListener("hashchange", fn);
  addEventListener(NAV, fn);
  return () => {
    removeEventListener("popstate", fn);
    removeEventListener("hashchange", fn);
    removeEventListener(NAV, fn);
  };
}

// Saved runs: every report opened on this machine, kept in localStorage.

export interface Saved {
  id: string;
  at: number;
  name: string;
  mode: Run["mode"];
  fps: number;
  hz: number;
  /** Missing on runs saved before ratings existed; opening one again fills it in. */
  rating?: Rating;
  url: string;
  data: string;
}

const KEY = "cadence.runs";

export function listRuns(): Saved[] {
  try {
    return JSON.parse(localStorage.getItem(KEY) ?? "[]") as Saved[];
  } catch {
    return [];
  }
}

export function saveRun(run: Run, data: string): Saved[] {
  const runs = listRuns().filter((r) => r.id !== run.id);
  const stats = computeStats(run);
  runs.unshift({
    id: run.id, at: run.at, name: run.device.name, mode: run.mode,
    fps: stats.fps, hz: run.hz, rating: stats.rating, url: run.url, data,
  });
  write(runs);
  return runs;
}

// Whether the note about where runs are saved was dismissed.
const NOTE = "cadence.savedNote";

export function savedNoteSeen(): boolean {
  try {
    return localStorage.getItem(NOTE) === "seen";
  } catch {
    return true;
  }
}

export function dismissSavedNote() {
  try {
    localStorage.setItem(NOTE, "seen");
  } catch {}
}

export function removeRun(id: string): Saved[] {
  const runs = listRuns().filter((r) => r.id !== id);
  write(runs);
  return runs;
}

function write(runs: Saved[]) {
  // Oldest first out when storage fills up.
  for (let n = runs.length; n > 0; n--) {
    try {
      localStorage.setItem(KEY, JSON.stringify(runs.slice(0, n)));
      return;
    } catch {}
  }
}

export async function importFile(file: File): Promise<{ run: Run; data: string }> {
  const text = await file.text();
  const run = JSON.parse(text) as Run;
  if (run?.v !== 1 || !Array.isArray(run.frames)) throw new Error("That file isn't a Cadence run.");
  return { run, data: await encodeRun(run) };
}

export { decodeRun, encodeRun };

export function download(run: Run) {
  const blob = new Blob([JSON.stringify(run)], { type: "application/json" });
  const a = document.createElement("a");
  const date = new Date(run.at).toISOString().slice(0, 10);
  a.href = URL.createObjectURL(blob);
  a.download = `cadence-${slug(run.device.name)}-${run.mode}-${date}.json`;
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 1000);
}

export async function copyText(text: string) {
  try {
    await navigator.clipboard.writeText(text);
  } catch {
    const ta = document.createElement("textarea");
    ta.value = text;
    ta.style.cssText = "position:fixed;opacity:0";
    document.body.append(ta);
    ta.select();
    document.execCommand("copy");
    ta.remove();
  }
}

function slug(s: string) {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

// Formatting

export function pathOf(url: string): string {
  try {
    const u = new URL(url);
    return u.host + (u.pathname === "/" ? "" : u.pathname);
  } catch {
    return url;
  }
}

export function when(at: number): string {
  const d = new Date(at);
  const diff = Date.now() - at;
  if (diff < 60_000) return "Just now";
  if (diff < 3_600_000) return `${Math.round(diff / 60_000)} min ago`;
  const time = d.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
  if (new Date().toDateString() === d.toDateString()) return `Today, ${time}`;
  return `${d.toLocaleDateString([], { month: "short", day: "numeric" })}, ${time}`;
}

export function ms(v: number | undefined, digits = 0): string {
  return v === undefined ? "" : `${v.toFixed(digits)} ms`;
}

/** Fixed categorical order; a run keeps its slot for the whole compare view. */
export const SERIES = ["#2a78d6", "#eb6834", "#1baf7a", "#eda100", "#e87ba4", "#008300", "#6250d6", "#e34948"];
