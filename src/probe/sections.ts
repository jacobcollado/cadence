import type { Section } from "../shared/run";

const CANDIDATES = [
  "main > section",
  "main > article",
  "main > header",
  "main > footer",
  "main > [aria-label]",
  "main > [data-hero]",
  "footer:not(main footer)",
].join(", ");

const UTILITY = /^(p|m|px|py|pt|pb|pl|pr|mx|my|mt|mb|ml|mr|w|h|min|max|flex|grid|gap|bg|text|font|border|rounded|relative|absolute|fixed|sticky|overflow|z|top|left|right|bottom|inset|items|justify|space|col|row|container|wrap|wrapper|inner|outer|root|block|hidden|sr)(-|$)/;

/**
 * Splits the page into the sections a person would name, and tracks which one
 * is under the middle of the screen. Marking an element with
 * data-cadence="Name" overrides the guesswork.
 */
export class Sections {
  els: Element[] = [];
  labels: string[] = [];
  active = -1;
  onChange: (() => void)[] = [];

  private io?: IntersectionObserver;
  private visible = new Set<number>();
  private path = location.pathname;
  private timer = 0;

  start() {
    this.scan();
    // Client-side navigation swaps the page without a reload.
    this.timer = window.setInterval(() => {
      if (location.pathname !== this.path || (this.els[0] && !this.els[0].isConnected)) this.scan();
    }, 1000);
  }

  stop() {
    clearInterval(this.timer);
    this.io?.disconnect();
  }

  scan() {
    this.path = location.pathname;
    this.io?.disconnect();
    this.visible.clear();

    const explicit = Array.from(document.querySelectorAll("[data-cadence]"));
    let els = explicit.length ? explicit : Array.from(document.querySelectorAll(CANDIDATES));
    if (!explicit.length) els = els.filter((el) => !els.some((o) => o !== el && o.contains(el)));
    if (els.length < 2) {
      const root = document.querySelector("main") ?? document.body;
      els = Array.from(root.children).filter((el) => (el as HTMLElement).offsetHeight > innerHeight * 0.3);
    }
    els = els.filter((el) => (el as HTMLElement).offsetHeight >= 40);

    this.els = els;
    this.labels = dedupe(els.map(labelFor));
    this.active = -1;

    // A thin band across the middle of the screen: whatever crosses it is the
    // section being looked at.
    this.io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          const i = this.els.indexOf(e.target);
          if (e.isIntersecting) this.visible.add(i);
          else this.visible.delete(i);
        }
        const next = this.visible.size ? Math.max(...this.visible) : -1;
        if (next !== this.active) {
          this.active = next;
          for (const fn of this.onChange) fn();
        }
      },
      { rootMargin: "-49% 0px -49% 0px", threshold: 0 },
    );
    for (const el of els) this.io.observe(el);
    for (const fn of this.onChange) fn();
  }

  label(): string {
    return this.labels[this.active] ?? "";
  }

  layout(): Section[] {
    return this.els.map((el, i) => {
      const r = el.getBoundingClientRect();
      return { label: this.labels[i], top: Math.round(r.top + scrollY), height: Math.round(r.height) };
    });
  }
}

function labelFor(el: Element, i: number): string {
  const named = el.getAttribute("data-cadence");
  if (named) return named;
  const aria = el.getAttribute("aria-label");
  if (aria && aria.length <= 32) return capitalize(aria);
  const by = el.getAttribute("aria-labelledby");
  if (by) {
    const text = document.getElementById(by.split(" ")[0])?.textContent?.trim();
    if (text && text.length <= 32) return capitalize(text);
  }
  if (el.hasAttribute("data-hero")) return "Hero";
  if (el.tagName === "FOOTER") return "Footer";
  if (el.tagName === "HEADER") return "Header";

  for (const raw of Array.from(el.classList)) {
    if (/[:[\]/]/.test(raw)) continue;
    const c = raw.replace(/^(index|section|home|page|site)[-_]+/, "").split("__")[0];
    if (c.length < 3 || UTILITY.test(c)) continue;
    return capitalize(c.replace(/[-_]+/g, " "));
  }
  const heading = el.querySelector("h1, h2, h3")?.textContent?.trim();
  if (heading && heading.length <= 32) return heading;
  return `Section ${i + 1}`;
}

function capitalize(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

function dedupe(labels: string[]): string[] {
  const seen = new Map<string, number>();
  return labels.map((l) => {
    const n = (seen.get(l) ?? 0) + 1;
    seen.set(l, n);
    return n > 1 ? `${l} ${n}` : l;
  });
}
