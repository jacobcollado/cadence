import { LOADS, MODES, encodeRun, type Mode, type Run } from "../shared/run";
import { choppyBelow, computeStats, RATING_LABEL, tier, type Rating } from "../shared/stats";
import { DUR, EASE, countUp, flipText, reducedMotion } from "../shared/motion";
import type { Monitor } from "./monitor";
import type { Runner } from "./runner";
import type { Sections } from "./sections";
import * as icon from "./icons";
import { STYLES } from "./styles";

type Child = Node | string | null | undefined | false;
type Props = Record<string, string | boolean | ((e: Event) => void) | undefined>;

function h(tag: string, props: Props = {}, ...children: Child[]): HTMLElement {
  const el = document.createElement(tag);
  for (const [k, v] of Object.entries(props)) {
    if (v === undefined || v === false) continue;
    if (k.startsWith("on") && typeof v === "function") el.addEventListener(k.slice(2), v);
    else if (k === "html") el.innerHTML = String(v);
    else el.setAttribute(k, v === true ? "" : String(v));
  }
  for (const c of children) if (c) el.append(c);
  return el;
}

function iconEl(markup: string): HTMLElement {
  const span = document.createElement("span");
  span.innerHTML = markup;
  return span.firstElementChild as HTMLElement;
}

const STORE = "cadence.ui";
const MARGIN = 12;

interface Saved {
  mode: Mode;
  load: number;
  collapsed: boolean;
  x: number;
  y: number;
}

interface Result {
  run: Run;
  link: string;
}

/** The panel that floats over the page on the device being tested. */
export class Overlay {
  private host = document.createElement("cadence-probe");
  private root = this.host.attachShadow({ mode: "open" });
  private el!: HTMLElement;
  private body!: HTMLElement;
  private canvas!: HTMLCanvasElement;
  private ctx!: CanvasRenderingContext2D;
  private fpsEl!: HTMLElement;
  private miniText!: HTMLElement;
  private dot!: HTMLElement;
  private where!: HTMLElement;
  private timer = 0;
  private view: "live" | "running" | "result" = "live";
  private pending = false;
  private optionsOpen = false;
  private state: Saved = { mode: "steady", load: 0, collapsed: false, x: MARGIN, y: MARGIN };
  private progressFill?: HTMLElement;
  private elapsedEl?: HTMLElement;
  private statusEl?: HTMLElement;

  constructor(
    private monitor: Monitor,
    private sections: Sections,
    private runner: Runner,
    private app: string,
    private onClose: () => void,
  ) {
    try {
      Object.assign(this.state, JSON.parse(sessionStorage.getItem(STORE) ?? "{}"));
    } catch {}
  }

  mount() {
    const style = document.createElement("style");
    style.textContent = STYLES;
    this.root.append(style, this.build());
    this.host.setAttribute("data-lenis-prevent", "");
    // Keep the page's own click, key and wheel handlers out of the panel.
    for (const type of ["click", "pointerdown", "pointerup", "mousedown", "mouseup", "keydown", "wheel"]) {
      this.host.addEventListener(type, (e) => e.stopPropagation());
    }
    document.body.append(this.host);
    this.place();
    this.sizeCanvas();
    addEventListener("resize", this.onResize);

    this.monitor.onFrame.push(this.frame);
    this.sections.onChange.push(() => flipText(this.where, this.sections.label()));
    flipText(this.where, this.sections.label());
    this.timer = window.setInterval(this.readout, 250);
    this.runner.onPhase = () => this.onPhase();
    this.runner.onDone = (run) => this.onDone(run);
    this.showLive();
  }

  unmount() {
    clearInterval(this.timer);
    removeEventListener("resize", this.onResize);
    this.host.remove();
  }

  // Structure

  private build(): HTMLElement {
    this.dot = h("span", { class: "dot" });
    this.miniText = h("span", { class: "num" }, "60 fps");
    const mini = h("button", { class: "mini", "aria-label": "Open Cadence", onclick: () => this.setCollapsed(false) }, this.dot, this.miniText);

    const head = h(
      "div",
      { class: "head" },
      h("span", { class: "brand" }, iconEl(icon.mark()), "Cadence"),
      h("button", { class: "icon-btn", "aria-label": "Minimize", onclick: () => this.setCollapsed(true) }, iconEl(icon.minus())),
      h("button", { class: "icon-btn", "aria-label": "Close Cadence", onclick: () => this.onClose() }, iconEl(icon.close())),
    );
    this.drag(head);

    this.fpsEl = h("span", { class: "fps num" }, "60");
    this.where = h("span", { class: "where" });
    this.canvas = h("canvas", { class: "graph", "aria-hidden": "true" }) as HTMLCanvasElement;
    this.ctx = this.canvas.getContext("2d")!;
    const live = h(
      "div",
      { class: "live" },
      h(
        "div",
        { class: "readout" },
        this.fpsEl,
        h("span", { class: "unit" }, "fps"),
        h("span", { class: "place", title: "Section on screen" }, iconEl(icon.locate()), this.where),
      ),
      this.canvas,
    );

    this.body = h("div", { class: "body" });
    const panel = h("div", { class: "panel", role: "dialog", "aria-label": "Cadence" }, head, live, this.body);

    this.el = h("div", { class: "cd", "data-collapsed": this.state.collapsed }, mini, panel);
    return this.el;
  }

  private setBody(...content: HTMLElement[]) {
    const from = this.body.offsetHeight;
    this.body.replaceChildren(h("div", { class: "body-inner enter" }, ...content));
    const to = this.body.offsetHeight;
    if (from && from !== to && !reducedMotion()) {
      this.body.animate([{ height: `${from}px` }, { height: `${to}px` }], { duration: DUR.slow, easing: EASE.out });
    }
    requestAnimationFrame(() => this.place());
  }

  private segmented<T extends string | number>(
    options: { id: T; label: string }[],
    value: T,
    onPick: (id: T) => void,
  ): HTMLElement {
    const wrap = h("div", { class: "seg", role: "group" });
    for (const o of options) {
      const b = h("button", { "aria-pressed": String(o.id === value) }, o.label);
      b.addEventListener("click", () => {
        wrap.querySelectorAll("button").forEach((x) => x.setAttribute("aria-pressed", String(x === b)));
        onPick(o.id);
      });
      wrap.append(b);
    }
    return wrap;
  }

  // Views

  private showLive() {
    this.view = "live";
    const hint = h("div", { class: "hint" });
    flipText(hint, MODES.find((m) => m.id === this.state.mode)!.hint);
    const modes = this.segmented(MODES, this.state.mode, (id) => {
      this.state.mode = id;
      this.save();
      flipText(hint, MODES.find((m) => m.id === id)!.hint);
    });

    const loadLabel = h("span", {}, this.loadText());
    const fold = h(
      "div",
      { class: "fold", "data-open": this.optionsOpen },
      h(
        "div",
        {},
        this.segmented(LOADS.map((l) => ({ id: l.ms, label: l.label })), this.state.load, (ms) => {
          this.state.load = ms;
          this.save();
          loadLabel.textContent = this.loadText();
        }),
        h("div", { class: "note" }, "Spends extra main-thread time every frame, the way a slower processor would."),
      ),
    );
    const disclose = h(
      "button",
      { class: "disclose", "aria-expanded": String(this.optionsOpen) },
      loadLabel,
      iconEl(icon.chevron()),
    );
    disclose.addEventListener("click", () => {
      this.optionsOpen = !this.optionsOpen;
      disclose.setAttribute("aria-expanded", String(this.optionsOpen));
      fold.toggleAttribute("data-open", this.optionsOpen);
    });

    const start = h("button", { class: "btn btn-primary", onclick: () => this.runner.start(this.state.mode, this.state.load) }, "Start run");
    this.setBody(modes, hint, disclose, fold, start);
  }

  private showRunning() {
    this.view = "running";
    this.statusEl = h("span", { class: "flip" });
    this.elapsedEl = h("span", { class: "num" }, "0.0 s");
    this.progressFill = h("div", { class: "fill" });
    flipText(this.statusEl, this.statusText());
    this.setBody(
      h("div", { class: "status" }, h("span", { class: "status-text" }, this.statusEl), this.elapsedEl),
      h("div", { class: "track" }, this.progressFill),
      h("button", { class: "btn btn-secondary", onclick: () => this.runner.stop() }, "Stop"),
    );
  }

  private showResult({ run, link }: Result) {
    this.view = "result";
    const s = computeStats(run);
    const big = h("span", { class: "big num" }, "0");
    const rows = (s.judged.length ? s.judged : s.sections.filter((x) => x.frames)).slice(0, 8);
    const bars = rows.map((r) => {
      const bar = h("div", { class: "bar", "data-rating": r.rating });
      return {
        bar,
        width: `${Math.max(2, (r.fps / s.hz) * 100)}%`,
        row: h(
          "div",
          { class: "bar-row" },
          h("span", { class: "bar-label" }, r.label),
          h("div", {}, bar),
          h("span", { class: "bar-value num" }, String(Math.round(r.fps))),
          h("span", { class: "bar-icon", "data-rating": r.rating }, iconEl(icon[r.rating]())),
        ),
      };
    });

    const copy = h("button", { class: "btn btn-secondary" }, iconEl(icon.link()), h("span", {}, "Copy link"));
    copy.addEventListener("click", async () => {
      await copyText(link);
      copy.replaceChildren(iconEl(icon.check()), h("span", {}, "Copied"));
      setTimeout(() => copy.replaceChildren(iconEl(icon.link()), h("span", {}, "Copy link")), 1600);
    });

    this.setBody(
      h(
        "div",
        {},
        h(
          "div",
          { class: "result-head" },
          big,
          h("span", { class: "unit" }, `fps out of ${s.hz}`),
          this.ratingTag(s.rating),
        ),
        h("p", { class: "sentence", style: "margin-top:8px" }, s.sentence),
      ),
      ...(bars.length ? [h("div", { class: "bars" }, ...bars.map((b) => b.row))] : []),
      ...(run.load ? [h("div", { class: "note" }, `Ran with ${this.loadName(run.load).toLowerCase()} added load.`)] : []),
      h("button", { class: "btn btn-primary", onclick: () => window.open(link, "_blank", "noopener") }, h("span", {}, "Open report"), iconEl(icon.external())),
      h(
        "div",
        { class: "row" },
        copy,
        h("button", { class: "btn btn-secondary", onclick: () => this.showLive() }, iconEl(icon.again()), h("span", {}, "New run")),
      ),
    );

    // The payoff: the number counts up as the bars grow in.
    countUp(big, s.fps, (v) => String(Math.round(v)));
    requestAnimationFrame(() =>
      requestAnimationFrame(() => bars.forEach((b, i) => {
        b.bar.style.transitionDelay = `${i * 40}ms`;
        b.bar.style.width = b.width;
      })),
    );
  }

  // Runner events

  private onPhase() {
    const phase = this.runner.phase;
    if (phase === "settling" || phase === "running") {
      if (this.view !== "running") this.showRunning();
      else if (this.statusEl) flipText(this.statusEl, this.statusText());
    } else if (phase === "ready" && this.view === "running" && !this.pending) {
      this.showLive();
    }
  }

  private async onDone(run: Run) {
    this.pending = true;
    const link = `${this.app}/r#${await encodeRun(run)}`;
    this.pending = false;
    this.showResult({ run, link });
  }

  private statusText(): string {
    if (this.runner.phase === "settling") return "Returning to the top";
    return { steady: "Scrolling the page", fast: "Scrolling fast", idle: "Holding still", manual: "Recording, use the page as normal" }[this.runner.mode];
  }

  private ratingTag(rating: Rating) {
    return h("span", { class: "rating", "data-rating": rating }, iconEl(icon[rating]()), RATING_LABEL[rating]);
  }

  private loadName(ms: number) {
    return LOADS.find((l) => l.ms === ms)?.label ?? `${ms} ms`;
  }

  private loadText() {
    return `Added load: ${this.loadName(this.state.load)}`;
  }

  // Every frame

  private frame = () => {
    if (this.state.collapsed) return;
    this.draw();
    if (this.view === "running" && this.progressFill) {
      this.progressFill.style.transform = `scaleX(${this.runner.progress})`;
    }
  };

  private readout = () => {
    const fps = Math.round(this.monitor.fps());
    const hz = this.monitor.hz;
    this.fpsEl.textContent = String(fps);
    this.miniText.textContent = `${fps} fps`;
    this.dot.dataset.rating = fps >= hz * 0.92 ? "smooth" : fps < choppyBelow(hz) ? "choppy" : "uneven";
    if (this.view === "running" && this.elapsedEl) {
      this.elapsedEl.textContent = `${(this.runner.elapsed / 1000).toFixed(1)} s`;
    }
  };

  private draw() {
    const { canvas, ctx } = this;
    const dpr = devicePixelRatio || 1;
    const W = canvas.width, H = canvas.height;
    const pitch = 2 * dpr;
    const durations = this.monitor.recent(Math.floor(W / pitch));
    const interval = 1000 / this.monitor.hz;
    const ceiling = interval * 4;
    const barW = Math.max(1, pitch - Math.max(1, dpr * 0.5));
    ctx.clearRect(0, 0, W, H);
    // Same tiers as the report: on time, late, frozen.
    for (const level of [0, 1, 2]) {
      ctx.fillStyle = ["#c6c6c0", "#f5a623", "#d03b3b"][level];
      for (let i = 0; i < durations.length; i++) {
        const d = durations[i];
        if (tier(d, interval) !== level) continue;
        const bh = Math.max(dpr, Math.min(1, d / ceiling) * H);
        ctx.fillRect(W - (durations.length - i) * pitch, H - bh, barW, bh);
      }
    }
  }

  // Layout

  private setCollapsed(collapsed: boolean) {
    this.state.collapsed = collapsed;
    this.el.toggleAttribute("data-collapsed", collapsed);
    this.save();
    requestAnimationFrame(() => this.place());
  }

  private place() {
    const panel = this.el.querySelector(".panel") as HTMLElement;
    const w = this.state.collapsed ? 96 : panel.offsetWidth;
    const hgt = this.state.collapsed ? 32 : panel.offsetHeight;
    this.state.x = clamp(this.state.x, MARGIN, innerWidth - w - MARGIN);
    this.state.y = clamp(this.state.y, MARGIN, innerHeight - hgt - MARGIN);
    this.host.style.setProperty("--x", `${this.state.x}px`);
    this.host.style.setProperty("--y", `${this.state.y}px`);
  }

  private drag(handle: HTMLElement) {
    handle.addEventListener("pointerdown", (e) => {
      if ((e.target as Element).closest("button")) return;
      handle.setPointerCapture(e.pointerId);
      const sx = e.clientX, sy = e.clientY, ox = this.state.x, oy = this.state.y;
      const move = (ev: PointerEvent) => {
        this.state.x = ox - (ev.clientX - sx);
        this.state.y = oy - (ev.clientY - sy);
        this.place();
      };
      const up = () => {
        handle.removeEventListener("pointermove", move);
        handle.removeEventListener("pointerup", up);
        handle.removeEventListener("pointercancel", up);
        this.save();
      };
      handle.addEventListener("pointermove", move);
      handle.addEventListener("pointerup", up);
      handle.addEventListener("pointercancel", up);
    });
  }

  private sizeCanvas() {
    const dpr = devicePixelRatio || 1;
    this.canvas.width = Math.round(this.canvas.clientWidth * dpr);
    this.canvas.height = Math.round(this.canvas.clientHeight * dpr);
  }

  private onResize = () => {
    this.sizeCanvas();
    this.place();
  };

  private save() {
    try {
      sessionStorage.setItem(STORE, JSON.stringify(this.state));
    } catch {}
  }
}

function clamp(v: number, lo: number, hi: number) {
  return Math.max(lo, Math.min(Math.max(lo, hi), v));
}

async function copyText(text: string) {
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
