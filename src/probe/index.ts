import type { Mode } from "../shared/run";
import { readDevice } from "./device";
import { Monitor } from "./monitor";
import { Observers } from "./observers";
import { Overlay } from "./overlay";
import { Runner } from "./runner";
import { Sections } from "./sections";

declare global {
  interface Window {
    __cadence?: { start(mode?: Mode, load?: number): void; stop(): void; close(): void };
  }
}

export interface BootOptions {
  /** Where reports open. Defaults to the hosted Cadence app. */
  app?: string;
  /** The probe's own script URL, so its work is labelled Cadence in reports. */
  src?: string;
}

/** Starts the probe: the panel, the frame monitor and the observers. Safe to call twice. */
export function boot(options: BootOptions = {}) {
  if (window.__cadence) return;

  const app = (options.app || __CADENCE_APP__).replace(/\/$/, "");
  const monitor = new Monitor();
  const sections = new Sections();
  const observers = new Observers(options.src ?? "");
  const runner = new Runner(monitor, sections, observers, readDevice());

  const close = () => {
    runner.stop();
    overlay.unmount();
    monitor.stop();
    sections.stop();
    observers.disconnect();
    try {
      sessionStorage.removeItem("cadence");
    } catch {}
    delete window.__cadence;
  };
  const overlay = new Overlay(monitor, sections, runner, app, close);

  sections.onChange.push(() => (monitor.section = sections.active));
  monitor.start();
  sections.start();
  overlay.mount();

  window.__cadence = {
    start: (mode = "steady", load = 0) => runner.start(mode, load),
    stop: () => runner.stop(),
    close,
  };
}

