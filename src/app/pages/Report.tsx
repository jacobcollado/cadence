import { useEffect, useRef, useState, type ReactNode } from "react";
import type { Run } from "../../shared/run";
import { LOADS } from "../../shared/run";
import {
  choppyBelow, computeStats, diagnose, FREEZE, MIN_SECTION_TIME, MODE_LABEL, RATING_LABEL, type Cause, type RunStats,
} from "../../shared/stats";
import { Bar, CopyButton, CountUp, Flip, Icon, Info, RatingTag, StatusIcon, StatusTag } from "../components/ui";
import { LEVEL_LABEL, memory, pageLoad, RATING_LEVEL, type Level, type MemoryReport, type Metric } from "../../shared/vitals";
import { Timeline } from "../components/Timeline";
import { TopBar } from "../components/TopBar";
import { decodeRun, download, pathOf, saveRun, when } from "../lib";

type State = { run: Run; stats: RunStats } | { error: string } | null;

export function Report() {
  const data = location.hash.slice(1);
  const [state, setState] = useState<State>(null);

  useEffect(() => {
    if (!data) return setState({ error: "This link doesn't include a run." });
    decodeRun(data)
      .then((run) => {
        saveRun(run, data);
        setState({ run, stats: computeStats(run) });
      })
      .catch(() => setState({ error: "This link doesn't hold a readable run. It may have been cut short when it was copied." }));
  }, [data]);

  return (
    <div className="shell">
      <TopBar back />
      {state && "error" in state && (
        <div className="recess empty enter" style={{ marginTop: 48 }}>
          <strong>Couldn't open this report</strong>
          {state.error}
        </div>
      )}
      {state && "run" in state && <ReportBody run={state.run} stats={state.stats} />}
    </div>
  );
}

type Tab = "smooth" | "load" | "memory";
const TABS: Tab[] = ["smooth", "load", "memory"];

function readTab(): Tab {
  const t = new URLSearchParams(location.search).get("tab");
  return TABS.includes(t as Tab) ? (t as Tab) : "smooth";
}

function ReportBody({ run, stats }: { run: Run; stats: RunStats }) {
  const [highlight, setHighlight] = useState<number | null>(null);
  const [tab, setTab] = useState<Tab>(readTab);
  const cause = diagnose(run, stats);
  const metrics = pageLoad(run);
  const mem = memory(run);
  const loadName = LOADS.find((l) => l.ms === run.load)?.label;
  const meta = [
    MODE_LABEL[run.mode],
    pathOf(run.url),
    when(run.at),
    `${run.hz} Hz screen`,
    run.load ? `${loadName} added load` : "",
  ].filter(Boolean).join(" · ");

  // Context that changes how to read every tab, so it sits above them.
  const notes = deviceNotes(run);
  if (run.hz === 30) notes.unshift("The browser held frames to 30 fps. On an iPhone that usually means Low Power Mode is on.");
  if (run.load) notes.unshift(`The probe added ${run.load} ms of main-thread work to every frame, the way a slower processor would.`);

  // The tab lives in the address, so a copied link opens on the same view.
  const pick = (t: Tab) => {
    setTab(t);
    const url = new URL(location.href);
    if (t === "smooth") url.searchParams.delete("tab");
    else url.searchParams.set("tab", t);
    history.replaceState(null, "", url);
  };

  const lede = tab === "smooth" ? stats.sentence : tab === "load" ? loadSentence(metrics, run) : mem?.text ?? memoryMissing(run);

  return (
    <>
      <header className="report-head enter">
        <div className="report-title">
          <h1 className="subtitle" style={{ viewTransitionName: `name-${run.id}` }}>{run.device.name}</h1>
          <p className="meta">{meta}</p>
        </div>
        <div className="actions">
          <DeviceButton run={run} />
          <button className="btn btn-secondary btn-icon-l" onClick={() => download(run)}>
            <Icon name="download" size={14} />Download JSON
          </button>
          <CopyButton text={() => location.href} />
        </div>
      </header>

      <div className="enter">
        <Overview run={run} stats={stats} metrics={metrics} mem={mem} tab={tab} onPick={pick} />
        <p className="lede-sentence" aria-live="polite"><Flip text={lede} className="flip-wrap" /></p>
        {notes.map((n) => <p key={n} className="note">{n}</p>)}
      </div>

      <div className="tab-panel enter" key={tab} role="tabpanel" id={`panel-${tab}`} aria-labelledby={`tab-${tab}`}>
        {tab === "smooth" && (
          <SmoothTab run={run} stats={stats} cause={cause} highlight={highlight} setHighlight={setHighlight} />
        )}
        {tab === "load" && <PageLoad metrics={metrics} />}
        {tab === "memory" && <MemoryCard run={run} m={mem} />}
      </div>
    </>
  );
}

/** One tile per graded category: the whole report at a glance, and the way into each part. */
function Overview({ run, stats, metrics, mem, tab, onPick }: {
  run: Run;
  stats: RunStats;
  metrics: Metric[];
  mem: MemoryReport | null;
  tab: Tab;
  onPick: (t: Tab) => void;
}) {
  const graded = metrics.filter((m) => m.level);
  const worstLoad = graded.find((m) => m.level === "bad") ?? graded.find((m) => m.level === "warn");
  const loadLevel: Level | undefined = graded.length ? worstLoad?.level ?? "good" : undefined;
  const lcp = metrics.find((m) => m.key === "lcp");
  const headline = worstLoad ?? lcp;
  const loadCounts = (["bad", "warn"] as Level[])
    .map((l) => [l, graded.filter((m) => m.level === l).length] as const)
    .filter(([, n]) => n);

  const tiles: { id: Tab; label: string; level?: Level; value: ReactNode; detail: string }[] = [
    {
      id: "smooth", label: "Smoothness", level: RATING_LEVEL[stats.rating],
      value: <><CountUp className="num" value={stats.fps} /><span className="tile-unit">fps</span></>,
      detail: `${RATING_LABEL[stats.rating]}, out of ${run.hz}`,
    },
    {
      id: "load", label: "Page load", level: loadLevel,
      value: headline?.value !== undefined ? <span className="num">{headline.display}</span> : <span className="tile-none">Not reported</span>,
      detail: !graded.length
        ? `${run.device.browser} doesn't report it`
        : loadCounts.length
          ? `${headline!.name}, ${loadCounts.map(([l, n]) => `${n} ${LEVEL_LABEL[l].toLowerCase()}`).join(", ")}`
          : `${headline?.name ?? "Every metric"}, all good`,
    },
    {
      id: "memory", label: "Memory", level: mem?.level,
      value: mem ? <><span className="num">{mem.peak.toFixed(1)}</span><span className="tile-unit">MB</span></> : <span className="tile-none">Not reported</span>,
      detail: mem ? `${mem.level === "good" ? "Steady" : "Growing"}, at its peak` : `${run.device.browser} doesn't report it`,
    },
  ];

  return (
    <div className="overview" role="tablist" aria-label="Report sections">
      {tiles.map((t) => (
        <button
          key={t.id}
          id={`tab-${t.id}`}
          role="tab"
          aria-selected={tab === t.id}
          aria-controls={`panel-${t.id}`}
          className="tile"
          onClick={() => onPick(t.id)}
        >
          <span className="tile-label">
            {t.level && <StatusIcon level={t.level} />}
            {t.label}
          </span>
          <span className="tile-value">{t.value}</span>
          <span className="tile-detail">{t.detail}</span>
        </button>
      ))}
    </div>
  );
}

function SmoothTab({ run, stats, cause, highlight, setHighlight }: {
  run: Run;
  stats: RunStats;
  cause: Cause;
  highlight: number | null;
  setHighlight: (i: number | null) => void;
}) {
  const rows = stats.sections.filter((s) => s.frames > 0);
  const budget = Math.round(stats.interval);
  const lane = run.support.loaf && run.tasks.length > 0;
  return (
    <>
      {rows.length > 0 && (
        <section className="card block">
          <div className="block-head">
            <div className="block-title title-row">
              <h2 className="h2">Sections</h2>
              <Info title="Sections">
                <p>The parts of the page, top to bottom, found from its landmarks and headings. Each frame counts toward the section crossing the middle of the screen when it was drawn.</p>
                <p>So a slow section is where to look in the code.</p>
              </Info>
            </div>
          </div>
          <div className="table-scroll">
            <table className="table">
              <thead>
                <tr>
                  <th>Section</th>
                  <th><span className="th-info">Rating<RatingInfo hz={run.hz} /></span></th>
                  <th>
                    <span className="th-info">Frame rate
                      <Info title="Frame rate">
                        <p>New frames drawn each second. This screen shows up to {run.hz}.</p>
                        <p>Near that, motion looks continuous. Under {choppyBelow(run.hz)} it visibly stutters.</p>
                      </Info>
                    </span>
                  </th>
                  <th className="r wide">
                    <span className="th-info">Dropped frames
                      <Info title="Dropped frames">
                        <p>Refreshes where the page wasn't ready, so the screen showed the last frame again.</p>
                        <p>Each one is a visible skip. A few in a second already read as jank, even when the average frame rate looks fine.</p>
                      </Info>
                    </span>
                  </th>
                  <th className="r wide">
                    <span className="th-info">Longest frame
                      <Info title="Longest frame">
                        <p>The single slowest frame in the section. Averages hide it; people don't.</p>
                        <p>Each frame has {Math.round(1000 / run.hz)} ms to make the refresh. Past {FREEZE} ms the page visibly stops and jumps, and that one frame is usually where the fix is.</p>
                      </Info>
                    </span>
                  </th>
                  <th className="r wide">
                    <span className="th-info">On screen
                      <Info title="On screen">
                        <p>How long the section was in the middle of the screen.</p>
                        <p>Longer means more frames behind its rating. Under {MIN_SECTION_TIME / 1000} s there's too little to judge, so it isn't rated.</p>
                      </Info>
                    </span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {rows.map((s, i) => {
                  const judged = s.time >= MIN_SECTION_TIME;
                  return (
                    <tr
                      key={s.index}
                      data-dim={!judged || undefined}
                      onPointerEnter={() => setHighlight(s.index)}
                      onPointerLeave={() => setHighlight(null)}
                    >
                      <td className="clip">{s.label}</td>
                      <td>{judged ? <RatingTag rating={s.rating} /> : <span className="brief">Too brief</span>}</td>
                      <td>
                        <div className="fps-cell">
                          <Bar value={s.fps / run.hz} rating={judged ? s.rating : undefined} delay={i * 40} />
                          <span className="num r">{Math.round(s.fps)}</span>
                        </div>
                      </td>
                      <td className="r num wide">{s.dropped}</td>
                      <td className="r num wide">{Math.round(s.worst)} ms</td>
                      <td className="r num wide">{(s.time / 1000).toFixed(1)} s</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </section>
      )}

      <section className="card block">
        <div className="block-head">
          <div className="block-title title-row">
            <h2 className="h2">Frames</h2>
            <Info title="Reading the frames">
              <p>Every frame of the run, left to right. A taller bar took longer to draw.</p>
              <p>Above the {budget} ms line a frame missed its refresh and turns amber. Past {FREEZE} ms it froze and turns red. Dark marks along the bottom are where the main thread was busy.</p>
              <p>Hover a section in the table to light up its frames.</p>
            </Info>
          </div>
          <div className="legend">
            <span><i className="swatch" style={{ background: "var(--data)" }} />On time</span>
            <span><i className="swatch" style={{ background: "var(--warn)" }} />Late</span>
            <span><i className="swatch" style={{ background: "var(--bad)" }} />Freeze over {FREEZE} ms</span>
            {lane && <span><i className="swatch" style={{ background: "var(--ink-2)" }} />Busy main thread</span>}
          </div>
        </div>
        <Timeline run={run} stats={stats} highlight={highlight} />
      </section>

      {cause.text && <CauseCard run={run} cause={cause} />}
    </>
  );
}

function loadSentence(metrics: Metric[], run: Run): string {
  const graded = metrics.filter((m) => m.level);
  if (!graded.length) return `${run.device.browser} didn't report page load timing for this visit.`;
  const named = (list: Metric[]) =>
    list.map((m, i) => `${i ? m.name.toLowerCase() : m.name} at ${m.display}`).join(list.length > 2 ? ", " : " and ");
  const bad = graded.filter((m) => m.level === "bad");
  const warn = graded.filter((m) => m.level === "warn");
  if (!bad.length && !warn.length) return "Every load metric was good.";
  const parts: string[] = [];
  if (bad.length) parts.push(`${named(bad)} ${bad.length > 1 ? "were" : "was"} poor`);
  if (warn.length) {
    const w = named(warn);
    parts.push(`${bad.length ? w.charAt(0).toLowerCase() + w.slice(1) : w} ${warn.length > 1 ? "need" : "needs"} work`);
  }
  const rest = graded.length - bad.length - warn.length;
  return `${parts.join(", and ")}.${rest ? " Everything else was good." : ""}`;
}

function memoryMissing(run: Run): string {
  return `${run.device.browser} doesn't expose memory use to pages. Chrome and Edge do.`;
}

/** Device details in a floating panel: context, not a result. */
function DeviceButton({ run }: { run: Run }) {
  const [open, setOpen] = useState(false);
  const wrap = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const away = (e: PointerEvent) => !wrap.current?.contains(e.target as Node) && setOpen(false);
    const key = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    addEventListener("pointerdown", away);
    addEventListener("keydown", key);
    return () => {
      removeEventListener("pointerdown", away);
      removeEventListener("keydown", key);
    };
  }, [open]);
  return (
    <div className="popover-wrap" ref={wrap}>
      <button className="btn btn-secondary btn-icon-l" aria-expanded={open} onClick={() => setOpen(!open)}>
        <Icon name="device" size={14} />Device
      </button>
      {open && (
        <div className="popover" role="dialog" aria-label="Device">
          <DevicePanel run={run} />
        </div>
      )}
    </div>
  );
}

function CauseCard({ run, cause }: { run: Run; cause: Cause }) {
  const shown = cause.culprits.slice(0, 8);
  const rest = cause.culprits.length - shown.length;
  return (
    <section className="card block">
      <div className="block-head">
        <div className="block-title">
          <h2 className="h2">Why it slowed down</h2>
          <p className="cause">{cause.text}</p>
        </div>
      </div>
      {shown.length > 0 && (
        <div className="table-scroll">
          <table className="table">
            <thead>
              <tr>
                <th>What ran</th>
                <th className="wide">Section</th>
                <th className="r">Times</th>
                <th className="r">Time spent</th>
              </tr>
            </thead>
            <tbody>
              {shown.map((c) => (
                <tr key={`${c.name} ${c.file ?? ""}`}>
                  <td className="clip">
                    <span>{c.name}</span>
                    {c.file && <span className="muted script-file">{c.file}</span>}
                  </td>
                  <td className="wide muted clip">{c.sections.join(", ")}</td>
                  <td className="r num">{c.count}</td>
                  <td className="r num">{Math.round(c.total)} ms</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {rest > 0 && <p className="note" style={{ marginTop: 12 }}>And {rest} more, in the downloaded data.</p>}
      {cause.culprits.some((c) => c.name === "Cadence" || c.file === "Cadence") && (
        <p className="note" style={{ marginTop: 12 }}>
          Scripts named Cadence are the probe itself{run.load ? ", including the added load" : ""}.
        </p>
      )}
    </section>
  );
}

function PageLoad({ metrics }: { metrics: Metric[] }) {
  const counts = (["bad", "warn", "good"] as Level[])
    .map((l) => [l, metrics.filter((m) => m.level === l).length] as const)
    .filter(([, n]) => n > 0);
  return (
    <section className="card block">
      <div className="block-head">
        <div className="block-title title-row">
          <h2 className="h2">Page load</h2>
          <Info title="Page load">
            <p>Measured from when this tab first loaded the site.</p>
            <p>Graded on Core Web Vitals, the thresholds Google publishes from real-user data, and on Lighthouse for page size. Each bar marks where good ends and poor begins.</p>
          </Info>
        </div>
        <div className="legend">
          {counts.map(([l, n]) => (
            <span key={l} className="num"><StatusIcon level={l} size={12} />{n} {LEVEL_LABEL[l].toLowerCase()}</span>
          ))}
        </div>
      </div>
      <div className="metrics">
        {metrics.map((m, i) => <MetricRow key={m.key} m={m} delay={i * 40} />)}
      </div>
    </section>
  );
}

function MetricRow({ m, delay }: { m: Metric; delay: number }) {
  return (
    <div className="metric">
      <div className="metric-name title-row">
        <span>{m.name}</span>
        <Info title={m.name}>
          <p>{m.what}</p>
          <p>{m.why}</p>
          {m.good !== undefined && <p>Good is {m.format(m.good)} or less. Over {m.format(m.poor!)} is poor.</p>}
          {m.value !== undefined && m.level && <p className="info-run">{runVerdict(m)}</p>}
        </Info>
      </div>
      {m.value === undefined ? (
        <div className="metric-missing">{m.missing}</div>
      ) : (
        <>
          <div className="metric-scale">{m.good !== undefined && <Scale m={m} delay={delay} />}</div>
          <div className="metric-value num">{m.display}</div>
          <div className="metric-status">{m.level && <StatusTag level={m.level} />}</div>
        </>
      )}
    </div>
  );
}

/** The value on a track, with the good and poor thresholds marked under it. */
function Scale({ m, delay }: { m: Metric; delay: number }) {
  const max = m.poor! * 1.6;
  const at = (v: number) => Math.min(1, v / max);
  return (
    <div className="scale">
      <div className="scale-track">
        <Bar value={Math.max(0.01, at(m.value!))} level={m.level === "good" ? undefined : m.level} delay={delay} />
      </div>
      {[m.good!, m.poor!].map((t) => (
        <span key={t} className="scale-tick num" style={{ left: `${at(t) * 100}%` }}>{m.format(t)}</span>
      ))}
    </div>
  );
}

function MemoryCard({ run, m }: { run: Run; m: MemoryReport | null }) {
  const mb = (v: number) => `${v.toFixed(1)} MB`;
  return (
    <section className="card block">
      <div className="block-head">
        <div className="block-title title-row">
          <h2 className="h2">Memory</h2>
          <Info title="Memory">
            <p>The JavaScript heap: what the page's scripts are holding on to, sampled twice a second.</p>
            <p>Some rise and fall is normal. Memory that only climbs is a leak, and on phones it ends with the tab reloading. Growing means it rose more than 10 MB and a fifth during the run.</p>
          </Info>
        </div>
        {m && <StatusTag level={m.level} label={m.level === "good" ? "Steady" : "Growing"} />}
      </div>
      {!m ? (
        <p className="cause">{memoryMissing(run)}</p>
      ) : (
        <>
          <p className="cause">{m.text}</p>
          <Spark samples={m.samples} />
          <dl className="kv kv-row">
            <div><dt>At start</dt><dd className="num">{mb(m.start)}</dd></div>
            <div><dt>Peak</dt><dd className="num">{mb(m.peak)}</dd></div>
            <div><dt>At end</dt><dd className="num">{mb(m.end)}</dd></div>
            <div><dt>Change</dt><dd className="num">{`${m.change >= 0 ? "+" : ""}${m.change.toFixed(1)} MB`}</dd></div>
          </dl>
        </>
      )}
    </section>
  );
}

/** Heap over the run: one quiet line on a soft fill. */
function Spark({ samples }: { samples: [number, number][] }) {
  const W = 400, H = 64;
  const t0 = samples[0][0], span = samples[samples.length - 1][0] - t0 || 1;
  const vs = samples.map(([, v]) => v);
  const lo = Math.min(...vs) * 0.98, hi = Math.max(...vs) * 1.02;
  const pts = samples.map(([t, v]) => [((t - t0) / span) * W, H - 2 - ((v - lo) / (hi - lo || 1)) * (H - 4)]);
  const line = pts.map(([x, y], i) => `${i ? "L" : "M"}${x.toFixed(1)} ${y.toFixed(1)}`).join("");
  return (
    <svg className="spark" viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" role="img" aria-label="Memory over the run">
      <defs>
        <linearGradient id="spark-fill" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="var(--data)" stopOpacity="0.45" />
          <stop offset="1" stopColor="var(--data)" stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={`${line}L${W} ${H}L0 ${H}Z`} fill="url(#spark-fill)" />
      <path d={line} fill="none" stroke="var(--data-line)" strokeWidth="2" vectorEffect="non-scaling-stroke" strokeLinejoin="round" />
    </svg>
  );
}

/** Things about the device that change how to read the result. */
function deviceNotes(run: Run): string[] {
  const d = run.device;
  const notes: string[] = [];
  if (d.reducedMotion) notes.push("Reduced motion was on, so the site may have skipped animation. Most visitors see more motion than this run did.");
  if (d.connection && /2g|3g/.test(d.connection)) notes.push(`On a ${d.connection.toUpperCase()} connection, so load times run long.`);
  if ((d.memory && d.memory <= 4) || (d.cores && d.cores <= 4)) notes.push("A lower-end device, which makes this a good stress test.");
  return notes;
}

function DevicePanel({ run }: { run: Run }) {
  const d = run.device;
  const groups: [string, [string, string | undefined][]][] = [
    ["System", [
      ["Operating system", [d.os, d.osVersion].filter(Boolean).join(" ")],
      ["Browser", [d.browser, d.browserVersion].filter(Boolean).join(" ")],
      ["Model", d.model],
    ]],
    ["Hardware", [
      ["Graphics", d.gpu],
      ["Processor cores", d.cores?.toString()],
      ["Memory", d.memory ? `${d.memory} GB or more` : undefined],
    ]],
    ["Display", [
      ["Screen", `${d.screen[0]} × ${d.screen[1]} at ${d.dpr}x`],
      ["Viewport", `${d.viewport[0]} × ${d.viewport[1]}`],
      ["Refresh rate", `${run.hz} Hz`],
    ]],
    ["Settings", [
      ["Input", d.touch ? "Touch" : "Pointer"],
      ["Network", d.connection?.toUpperCase()],
      ["Reduced motion", d.reducedMotion ? "On" : "Off"],
    ]],
  ];
  return (
    <>
      <div className="popover-head">
        <h2 className="h2">Device</h2>
      </div>
      <div className="device-groups">
        {groups.map(([title, items]) => {
          const shown = items.filter(([, v]) => v);
          if (!shown.length) return null;
          return (
            <dl key={title} className="device-group">
              <div className="device-group-title">{title}</div>
              {shown.map(([k, v]) => <div key={k}><dt>{k}</dt><dd>{v}</dd></div>)}
            </dl>
          );
        })}
      </div>
    </>
  );
}

/** Every rating a section can get, with the rule behind it. */
function RatingInfo({ hz }: { hz: number }) {
  return (
    <Info title="Rating">
      <p>How the section felt while scrolling, from its frames.</p>
      <div className="rating-defs">
        <div className="rating-def"><RatingTag rating="smooth" /><span>Holds 92% of {hz} fps, with 95% of frames on time and none over {FREEZE} ms.</span></div>
        <div className="rating-def"><RatingTag rating="uneven" /><span>Mostly fine, with dropped frames or a freeze you can notice.</span></div>
        <div className="rating-def"><RatingTag rating="choppy" /><span>Under {choppyBelow(hz)} fps, where motion stops looking continuous.</span></div>
      </div>
      <p>Too brief means it was on screen under {MIN_SECTION_TIME / 1000} s, too short to judge.</p>
    </Info>
  );
}

/** Where this run's value lands against the thresholds, in words. */
function runVerdict(m: Metric): string {
  const v = m.value!, good = m.good!, poor = m.poor!;
  if (m.key === "cls" && v === 0) return "This run: 0, so nothing moved once it appeared.";
  const here = `This run: ${m.display}`;
  if (m.level === "good") return v <= good / 2 ? `${here}, well inside good.` : `${here}, inside good.`;
  if (m.level === "warn") return `${here}, past good but not yet poor.`;
  return v > poor * 1.5 ? `${here}, far past the poor line.` : `${here}, past the poor line.`;
}
