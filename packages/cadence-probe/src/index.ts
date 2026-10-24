// cadence-probe: add Cadence to any site. Nothing loads for visitors; the probe
// only downloads and starts when the address carries the switch (?perf), and
// stays on for that tab until it's closed or ?perf=off.

export interface CadenceOptions {
  /** The query switch that turns the probe on. Default "perf", as in ?perf. */
  param?: string;
  /** Where reports open. Default: the hosted Cadence app. */
  app?: string;
  /** Set false to never load, for example outside staging. Default true. */
  enabled?: boolean;
}

const KEY = "cadence";

/** Whether this tab asked for the probe: ?perf turns it on, ?perf=off off. */
export function wantsCadence(param = "perf"): boolean {
  if (typeof window === "undefined") return false;
  try {
    const q = new URLSearchParams(location.search);
    if (q.get(param) === "off") {
      sessionStorage.removeItem(KEY);
      return false;
    }
    if (q.has(param)) sessionStorage.setItem(KEY, "1");
    return sessionStorage.getItem(KEY) === "1";
  } catch {
    return false;
  }
}

/** Loads and starts the probe if this tab asked for it. Safe to call more than once. */
export async function loadCadence(options: CadenceOptions = {}): Promise<boolean> {
  if (options.enabled === false || !wantsCadence(options.param)) return false;
  // The probe is its own chunk, so sites only ever download it with ?perf.
  const { boot } = await import("../../../src/probe/index");
  const start = () => boot({ app: options.app });
  if (document.body) start();
  else document.addEventListener("DOMContentLoaded", start, { once: true });
  return true;
}
