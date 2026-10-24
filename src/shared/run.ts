// One recorded pass on one device. The probe writes it, the app reads it, and
// the same shape travels in a report link, a saved file and (later) Supabase.

export type Mode = "steady" | "fast" | "idle" | "manual";

export const MODES: { id: Mode; label: string; hint: string }[] = [
  { id: "steady", label: "Steady", hint: "Scrolls the whole page at one screen per second." },
  { id: "fast", label: "Fast", hint: "Scrolls the whole page at four screens per second." },
  { id: "idle", label: "Idle", hint: "Holds still where you are for ten seconds." },
  { id: "manual", label: "Manual", hint: "Records while you scroll and tap, up to two minutes." },
];

export const LOADS: { ms: number; label: string }[] = [
  { ms: 0, label: "None" },
  { ms: 4, label: "Light" },
  { ms: 8, label: "Heavy" },
];

export interface Device {
  name: string;
  kind: "phone" | "tablet" | "computer";
  os: string;
  osVersion?: string;
  browser: string;
  browserVersion?: string;
  model?: string;
  gpu?: string;
  cores?: number;
  memory?: number;
  screen: [number, number];
  viewport: [number, number];
  dpr: number;
  touch: boolean;
  connection?: string;
  reducedMotion: boolean;
}

export interface Section {
  label: string;
  top: number;
  height: number;
}

/** A long animation frame (or long task where that's all the browser has). */
export interface Task {
  /** Start, ms from the run's start. */
  t: number;
  d: number;
  /** Blocking time: the part past 50ms that held up input. */
  b: number;
  src?: string;
  fn?: string;
  inv?: string;
}

export interface Vitals {
  ttfb?: number;
  fcp?: number;
  lcp?: number;
  cls?: number;
  inp?: number;
  nodes?: number;
  canvases?: number;
}

export interface Support {
  loaf: boolean;
  shifts: boolean;
  memory: boolean;
  inp: boolean;
  lcp: boolean;
}

export interface Run {
  v: 1;
  id: string;
  at: number;
  url: string;
  title: string;
  mode: Mode;
  /** Extra main-thread work the probe added per frame, ms. */
  load: number;
  hz: number;
  device: Device;
  /** Frame durations in tenths of a millisecond. */
  frames: number[];
  /** scrollY at each frame. */
  scroll: number[];
  /** Section on screen at each frame, an index into sections (-1 for none). */
  seg: number[];
  sections: Section[];
  tasks: Task[];
  /** [ms from start, shift value × 10000] */
  shifts: [number, number][];
  /** [ms from start, JS heap MB × 10] */
  mem: [number, number][];
  vitals: Vitals;
  support: Support;
}

// Encoding: JSON, deflated, base64url. Small enough to ride in a URL hash.

export async function encodeRun(run: Run): Promise<string> {
  const bytes = new TextEncoder().encode(JSON.stringify(run));
  const stream = new Blob([bytes]).stream().pipeThrough(new CompressionStream("deflate-raw"));
  return toBase64Url(new Uint8Array(await new Response(stream).arrayBuffer()));
}

export async function decodeRun(text: string): Promise<Run> {
  const bytes = fromBase64Url(text.trim());
  const stream = new Blob([bytes as BlobPart]).stream().pipeThrough(new DecompressionStream("deflate-raw"));
  const run = JSON.parse(await new Response(stream).text()) as Run;
  if (run?.v !== 1 || !Array.isArray(run.frames)) throw new Error("Not a Cadence run");
  return run;
}

function toBase64Url(bytes: Uint8Array): string {
  let s = "";
  for (let i = 0; i < bytes.length; i += 0x8000) {
    s += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  }
  return btoa(s).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function fromBase64Url(text: string): Uint8Array {
  const s = atob(text.replace(/-/g, "+").replace(/_/g, "/"));
  const out = new Uint8Array(s.length);
  for (let i = 0; i < s.length; i++) out[i] = s.charCodeAt(i);
  return out;
}

export function shortId(): string {
  return Math.random().toString(36).slice(2, 10);
}
