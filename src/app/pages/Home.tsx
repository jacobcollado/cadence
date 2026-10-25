import { useEffect, useRef, useState, type ComponentProps, type CSSProperties, type ReactNode } from "react";
import { MODE_LABEL } from "../../shared/stats";
import { CopyButton, Icon, Qr, RatingTag, ScoreRing, splitName, StatusIcon } from "../components/ui";
import { GlassRow, MiniFrames, ProbePane, ScrollPanes } from "../components/HowVisuals";
import { tint } from "../glass";
import { GlassFrames } from "../components/GlassFrames";
import { RATING_LEVEL } from "../../shared/vitals";
import { TopBar } from "../components/TopBar";
import { Install } from "../components/Install";
import { GlassFan } from "../components/GlassFan";
import { OPEN_SETUP } from "../components/Footer";
import { importFile, listRuns, navigate, pathOf, removeRun, saveRun, when, type Saved } from "../lib";
import { DUR, EASE, reducedMotion } from "../../shared/motion";
import { INERTIA_RUN } from "../examples";

const TARGET = "cadence.target";

type IconName = ComponentProps<typeof Icon>["name"];

// The example cards' runs: the studio site scrolls clean, the demo keeps missing frames.
const SMOOTH = [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1];
// Nothing recorded yet: every pane gray.
const NONE = Array(12).fill(0);
const SLOW = [1, 1, 0, 1, 1, 0, 0, 0, 1, 1, 0, 1, 0, 0, 1, 1];

// What the slow demo gets wrong, one mistake per section.
const MISTAKES = ["Glowing canvas", "Forced layout", "Blocking tracker", "Script animation", "Resizing form"];

const FREE: { icon: IconName; title: string }[] = [
  { icon: "check", title: "Free, with no account" },
  { icon: "lock", title: "Runs stay private" },
  { icon: "device", title: "Off for your visitors" },
  { icon: "code", title: "Open source" },
];

function withPerf(base: string): string {
  const raw = base.trim();
  if (!raw) return "";
  try {
    const u = new URL(/^https?:\/\//.test(raw) ? raw : `https://${raw}`);
    return `${u.origin}${u.pathname}${u.search ? `${u.search}&perf` : "?perf"}`;
  } catch {
    return raw;
  }
}

export function Home() {
  const [base, setBase] = useState(() => {
    try {
      return localStorage.getItem(TARGET) ?? "";
    } catch {
      return "";
    }
  });
  const [runs, setRuns] = useState<Saved[]>(listRuns);
  const [selected, setSelected] = useState<string[]>([]);
  const [dragging, setDragging] = useState(false);
  const [error, setError] = useState("");
  const fileInput = useRef<HTMLInputElement>(null);
  const link = withPerf(base);

  useEffect(() => {
    try {
      localStorage.setItem(TARGET, base);
    } catch {}
  }, [base]);

  // Drop a saved run anywhere on the page to open it.
  useEffect(() => {
    let depth = 0;
    const enter = (e: DragEvent) => {
      if (!e.dataTransfer?.types.includes("Files")) return;
      depth++;
      setDragging(true);
    };
    const leave = () => {
      if (--depth <= 0) { depth = 0; setDragging(false); }
    };
    const over = (e: DragEvent) => e.preventDefault();
    const drop = (e: DragEvent) => {
      e.preventDefault();
      depth = 0;
      setDragging(false);
      const file = e.dataTransfer?.files[0];
      if (file) open(file);
    };
    addEventListener("dragenter", enter);
    addEventListener("dragleave", leave);
    addEventListener("dragover", over);
    addEventListener("drop", drop);
    return () => {
      removeEventListener("dragenter", enter);
      removeEventListener("dragleave", leave);
      removeEventListener("dragover", over);
      removeEventListener("drop", drop);
    };
  }, []);

  const open = async (file: File) => {
    try {
      const { run, data } = await importFile(file);
      saveRun(run, data);
      navigate(`/r#${data}`);
    } catch (e) {
      setError(e instanceof Error && e.message.includes("Cadence") ? e.message : "That file couldn't be read.");
    }
  };

  const toggle = (id: string) =>
    setSelected((s) => (s.includes(id) ? s.filter((x) => x !== id) : [...s, id]));

  const remove = (id: string, row: HTMLElement) => {
    const done = () => {
      setRuns(removeRun(id));
      setSelected((s) => s.filter((x) => x !== id));
    };
    if (reducedMotion()) return done();
    // The row folds away in place rather than vanishing.
    row.animate(
      [
        { height: `${row.offsetHeight}px`, opacity: 1 },
        { height: "0px", opacity: 0, paddingTop: "0px", paddingBottom: "0px", minHeight: "0px" },
      ],
      { duration: DUR.base, easing: EASE.inOut, fill: "forwards" },
    ).onfinish = done;
  };

  return (
    <div className="shell">
      <TopBar />

      <div className="rails">
      <section className="start enter">
        <div className="start-top">
          <div className="start-copy">
            <h1 className="title">Stress test your site on the devices your customers use.</h1>
            <p className="lede">
              A free, open source probe that scrolls your pages on real devices and shows which section stutters, and why.
            </p>
            <div className="start-actions">
              <a href="/docs" className="btn btn-lg btn-primary" onClick={(e) => { e.preventDefault(); navigate("/docs"); }}>Get started</a>
              <a href={`/r?example#${INERTIA_RUN}`} className="btn btn-lg btn-secondary" onClick={(e) => { e.preventDefault(); navigate(`/r?example#${INERTIA_RUN}`); }}>See a report</a>
            </div>
          </div>
          <GlassFan />
        </div>
      </section>

      <Reveal split title="Fast on your laptop, choppy on their phone" lede="Load scores never see the scroll. Cadence does.">
        <GlassFrames />
      </Reveal>

      <Reveal title="How it works" lede="Two lines of code, then test any page.">
        <ol className="how-grid">
          <li className="card how-step">
            <div className="how-visual"><ProbePane /></div>
            <h3 className="how-title">Add the probe</h3>
            <p className="meta">One component in your root layout.</p>
          </li>
          <li className="card how-step">
            <div className="how-visual"><ScrollPanes /></div>
            <h3 className="how-title">Open with <span className="nowrap">?perf</span></h3>
            <p className="meta">Pick a pass in the panel.</p>
          </li>
          <li className="card how-step">
            <div className="how-visual"><MiniFrames /></div>
            <h3 className="how-title">Read the report</h3>
            <p className="meta">Which section stuttered, and why.</p>
          </li>
        </ol>
      </Reveal>

      <Reveal split title="See it in action" lede="A real report, and a page that's slow on purpose.">
        <div className="example-cards">
          <a className="card example" href={`/r?example#${INERTIA_RUN}`} onClick={(e) => { e.preventDefault(); navigate(`/r?example#${INERTIA_RUN}`); }}>
            <GlassRow run={SMOOTH} className="example-run" />
            <span className="example-copy">
              <span className="example-title">Inertia, our studio's site</span>
              <span className="meta">Smooth scrolling, but the largest paint takes {"5.4 s"}.</span>
            </span>
            <span className="example-go">Open report<Icon name="forward" size={14} /></span>
          </a>
          <a className="card example" href="/demo.html" target="_blank" rel="noopener">
            <GlassRow run={SLOW} className="example-run" />
            <span className="example-copy">
              <span className="example-title">A page that's slow on purpose</span>
              <span className="example-tags">
                {MISTAKES.map((m) => <span key={m} className="example-tag">{m}</span>)}
              </span>
            </span>
            <span className="example-go">Open demo<Icon name="external" size={14} /></span>
          </a>
        </div>
      </Reveal>

      <Reveal title="Free, open and private">
        <ul className="free-grid">
          {FREE.map((f, i) => (
            <li key={f.title} className="free">
              <span className="glass free-tile" style={{ "--c": tint(i / (FREE.length - 1)) } as CSSProperties}><Icon name={f.icon} size={16} /></span>
              <span className="example-title">{f.title}</span>
            </li>
          ))}
        </ul>
      </Reveal>

      <Reveal title="Run a test" lede="Install once, then open any page here or on a phone.">
        <div className="test-stack">
          <Setup />
          <div className="start-cards">
            <div className="card start-card">
              <div className="start-card-head">
                <span className="glass free-tile" style={{ "--c": tint(1 / 3) } as CSSProperties}><Icon name="device" size={16} /></span>
                <span>
                  <h3 className="h2">Test on this device</h3>
                  <p className="meta">Opens the page with the probe on.</p>
                </span>
              </div>
              <label className="field-label" htmlFor="target">Page</label>
              <div className="link-row">
                <input
                  id="target"
                  className="field"
                  value={base}
                  onChange={(e) => setBase(e.target.value)}
                  spellCheck={false}
                  autoCapitalize="off"
                  placeholder="https://example.com"
                />
                <CopyButton text={() => link} label="Copy link" className="btn btn-lg btn-secondary btn-icon-l" disabled={!link} />
                <a className="btn btn-lg btn-primary" href={link || undefined} aria-disabled={!link || undefined} target="_blank" rel="noopener">Open</a>
              </div>
            </div>
            <div className="card start-card qr-card">
              <div className="start-card-head">
                <span className="glass free-tile" style={{ "--c": tint(2 / 3) } as CSSProperties}><Icon name="phone" size={16} /></span>
                <span>
                  <h3 className="h2">Test on a phone</h3>
                  <p className="meta">Scan to open it there.</p>
                </span>
              </div>
              {link ? <Qr text={link} /> : <div className="qr-empty">Enter a page to get its code</div>}
            </div>
          </div>
        </div>
      </Reveal>

      <section className="home-sec runs" id="runs">
        <div className="runs-head">
          <h2 className="h2">
            Runs {runs.length > 0 && <span className="muted num">{runs.length}</span>}
          </h2>
          {runs.length >= 2 && selected.length < 2 && <span className="runs-hint">Select two or more to compare</span>}
          {selected.length >= 2 && (
            <button
              className="btn btn-primary btn-icon-l"
              style={{ animation: `rise ${DUR.slow}ms ${EASE.out} both` }}
              onClick={() => navigate(`/compare#${selected.join(",")}`)}
            >
              <Icon name="compare" size={14} />Compare {selected.length}
            </button>
          )}
          <button className="btn btn-secondary btn-icon-l" onClick={() => fileInput.current?.click()}>
            <Icon name="upload" size={14} />Import
          </button>
          <input
            ref={fileInput}
            type="file"
            accept="application/json,.json"
            hidden
            onChange={(e) => e.target.files?.[0] && open(e.target.files[0])}
          />
        </div>
        {error && <p className="note" style={{ marginBottom: 12, color: "var(--bad)" }}>{error}</p>}

        {runs.length === 0 ? (
          <div className="runs-empty">
            <GlassRow run={NONE} className="runs-empty-row" />
            <strong>No runs yet</strong>
            Finish a run on any device and open its report. It lands here, ready to compare.
          </div>
        ) : (
          <div className="run-list">
            <div className="run-head-row" aria-hidden="true">
              <span />
              <span>Device</span>
              <span className="col-browser">Browser</span>
              <span className="col-mode">Mode</span>
              <span className="col-page">Page</span>
              <span className="col-when">When</span>
              <span className="run-tag">Rating</span>
              <span className="col-score">Score</span>
              <span className="r">Frame rate</span>
              <span />
            </div>
            {runs.map((r) => { const n = splitName(r.name); return (
              <div
                key={r.id}
                className="run-row"
                role="link"
                tabIndex={0}
                onClick={() => navigate(`/r#${r.data}`)}
                onKeyDown={(e) => e.key === "Enter" && navigate(`/r#${r.data}`)}
              >
                <input
                  type="checkbox"
                  className="check"
                  checked={selected.includes(r.id)}
                  onClick={(e) => e.stopPropagation()}
                  onChange={() => toggle(r.id)}
                  aria-label={`Select ${r.name} to compare`}
                />
                <div className="run-main">
                  <div className="run-name"><span style={{ viewTransitionName: `name-${r.id}` }}>{n.device}</span></div>
                  <div className="run-sub">{n.browser}</div>
                </div>
                <span className="run-cell col-browser">{n.browser}</span>
                <span className="run-cell col-mode">{MODE_LABEL[r.mode]}</span>
                <span className="run-cell col-page">{pathOf(r.url)}</span>
                <span className="run-cell col-when">{when(r.at)}</span>
                <span className="run-tag">{r.rating && <RatingTag rating={r.rating} />}</span>
                <span className="col-score">{r.score !== undefined && <ScoreRing score={r.score} size={28} />}</span>
                <div className="run-score">
                  <div className="run-fps">
                    {r.rating && <span className="run-icon"><StatusIcon level={RATING_LEVEL[r.rating]} /></span>}
                    <strong className="num">{Math.round(r.fps)}</strong>
                    <span>fps</span>
                  </div>
                </div>
                <button
                  className="icon-btn"
                  aria-label={`Remove ${r.name}`}
                  onClick={(e) => {
                    e.stopPropagation();
                    remove(r.id, (e.currentTarget as HTMLElement).closest(".run-row") as HTMLElement);
                  }}
                >
                  <Icon name="trash" />
                </button>
              </div>
            ); })}
            <p className="run-foot"><span className="run-foot-icon"><Icon name="info" size={14} /></span>Saved in this browser. Report links open on any device.</p>
          </div>
        )}
      </section>
      </div>

      {dragging && <div className="drop-veil">Drop a run to open it</div>}
    </div>
  );
}

/** Setup: a folded row that opens the install steps. */
function Setup() {
  const [open, setOpen] = useState(() => location.hash === "#setup");
  const el = useRef<HTMLDivElement>(null);
  // The footer's Set up link opens this row and brings it into view.
  useEffect(() => {
    const show = () => {
      setOpen(true);
      requestAnimationFrame(() => el.current?.scrollIntoView({ behavior: reducedMotion() ? "auto" : "smooth", block: "center" }));
    };
    if (location.hash === "#setup") show();
    addEventListener(OPEN_SETUP, show);
    return () => removeEventListener(OPEN_SETUP, show);
  }, []);
  return (
    <div className="card setup" id="setup" ref={el} data-open={open || undefined}>
      <button className="setup-btn" aria-expanded={open} onClick={() => setOpen(!open)}>
        <span className="glass free-tile" style={{ "--c": tint(0) } as CSSProperties}><Icon name="terminal" size={16} /></span>
        <span className="setup-title">Add Cadence to your site</span>
        <span className="setup-peek">npm install cadence-probe</span>
        <Icon name="chevron" size={16} />
      </button>
      <div className="disclosure-body" data-open={open || undefined}>
        <div>
          <div className="setup-body">
            <p className="meta">It stays off until a page's address ends in ?perf, so visitors never load it.</p>
            <Install />
          </div>
        </div>
      </div>
    </div>
  );
}

/** A home section: its heading above the content (beside it when split), rising
    into place the first time it scrolls into view. */
function Reveal({ title, lede, split, children }: { title: string; lede?: string; split?: boolean; children: ReactNode }) {
  const el = useRef<HTMLElement>(null);
  const [shown, setShown] = useState(reducedMotion);
  useEffect(() => {
    if (shown) return;
    const io = new IntersectionObserver(([e]) => {
      if (!e.isIntersecting) return;
      setShown(true);
      io.disconnect();
    }, { rootMargin: "0px 0px -10% 0px" });
    io.observe(el.current!);
    return () => io.disconnect();
  }, []);
  return (
    <section ref={el} className="home-sec" data-split={split || undefined} data-shown={shown || undefined}>
      <div className="home-head">
        <h2 className="subtitle">{title}</h2>
        {lede && <p className="lede">{lede}</p>}
      </div>
      <div className="home-body">{children}</div>
    </section>
  );
}
