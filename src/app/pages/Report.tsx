import { useEffect, useRef, useState, type ReactNode } from "react";
import type { Run } from "../../shared/run";
import { LOADS } from "../../shared/run";
import {
  choppyBelow, computeStats, diagnose, FREEZE, MIN_SECTION_TIME, MODE_LABEL, RATING_LABEL, type Cause, type RunStats,
} from "../../shared/stats";
import { Bar, CopyButton, CountUp, Fields, Flip, Icon, Info, RatingTag, splitName, StatusIcon, StatusTag, ZoneBar } from "../components/ui";
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
      <TopBar />
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
  const name = splitName(run.device.name);
  const fields: [string, string][] = [
    ["Browser", name.browser],
    ["Mode", MODE_LABEL[run.mode]],
    ["Page", pathOf(run.url)],
    ["Time", when(run.at)],
    ["Screen", `${run.hz} Hz`],
  ];
  if (run.load) fields.push(["Added load", loadName ?? `${run.load} ms`]);

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
          <h1 className="subtitle" style={{ viewTransitionName: `name-${run.id}` }}>{name.device}</h1>
          <Fields items={fields.filter(([, v]) => v)} />
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
        {tab === "load" && (
          <>
            <StatRow items={["lcp", "cls", "fcp", "ttfb"].map((k) => {
              const m = metrics.find((x) => x.key === k)!;
              return { label: m.name, value: m.value === undefined ? "None" : m.display, sub: m.level ? LEVEL_LABEL[m.level] : "Not reported", level: m.level };
            })} />
            <PageLoad metrics={metrics} />
          </>
        )}
        {tab === "memory" && (
          <>
            {mem && (
              <StatRow items={[
                { label: "At start", value: mem.start.toFixed(1), unit: "MB", sub: "When the run began" },
                { label: "Peak", value: mem.peak.toFixed(1), unit: "MB", sub: "The most it held" },
                { label: "At end", value: mem.end.toFixed(1), unit: "MB", sub: "When the run finished" },
                { label: "Change", value: `${mem.change >= 0 ? "+" : ""}${mem.change.toFixed(1)}`, unit: "MB", sub: mem.level === "good" ? "Steady" : "Growing", level: mem.level },
              ]} />
            )}
            <MemoryCard run={run} m={mem} />
          </>
        )}
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
  const judged = stats.judged;
  const smoothCount = judged.filter((s) => s.rating === "smooth").length;
  const budget = Math.round(stats.interval);
  const lane = run.support.loaf && run.tasks.length > 0;
  return (
    <>
      <StatRow items={[
        { label: "Dropped frames", value: `${stats.dropped}`, sub: `Of ${stats.frames.toLocaleString()} frames`, level: stats.dropped ? "warn" : "good" },
        { label: "Freezes", value: `${stats.freezes}`, sub: `Frames over ${FREEZE} ms`, level: stats.freezes ? "bad" : "good" },
        { label: "Longest frame", value: `${Math.round(stats.worst)}`, unit: "ms", sub: `Each frame has ${Math.round(stats.interval)} ms`, level: stats.worst >= FREEZE ? "bad" : stats.worst > stats.interval * 1.5 ? "warn" : "good" },
        { label: "Smooth sections", value: `${smoothCount}`, unit: `of ${judged.length}`, sub: judged.length ? "Rated on frame rate" : "None long enough to rate", level: judged.length && smoothCount === judged.length ? "good" : smoothCount ? "warn" : "bad" },
      ]} />

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

      <div className={cause.text ? "dash-split" : undefined}>
      {rows.length > 0 && (
        <section className="card block" data-compact={cause.text ? true : undefined}>
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
                        <ZoneBar
                          zones={[
                            { to: choppyBelow(run.hz), level: "bad", label: "Choppy" },
                            { to: run.hz * 0.92, level: "warn", label: "Uneven" },
                            { to: run.hz, level: "good", label: "Smooth" },
                          ]}
                          min={Math.round(run.hz / 2)}
                          max={run.hz}
                          format={(v) => `${Math.round(v)} fps`}
                        />
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
                  <th className="r wide split-hide">
                    <span className="th-info">Longest frame
                      <Info title="Longest frame">
                        <p>The single slowest frame in the section. Averages hide it; people don't.</p>
                        <p>Each frame has {Math.round(1000 / run.hz)} ms to make the refresh. Past {FREEZE} ms the page visibly stops and jumps, and that one frame is usually where the fix is.</p>
                        <ZoneBar
                          zones={[
                            { to: 1000 / run.hz, level: "good", label: "On time" },
                            { to: FREEZE, level: "warn", label: "Late" },
                            { to: FREEZE * 1.6, level: "bad", label: "Freeze" },
                          ]}
                          max={FREEZE * 1.6}
                          format={(v) => `${Math.round(v)} ms`}
                        />
                      </Info>
                    </span>
                  </th>
                  <th className="r wide split-hide">
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
                      <td className="r num wide split-hide">{Math.round(s.worst)} ms</td>
                      <td className="r num wide split-hide">{(s.time / 1000).toFixed(1)} s</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </section>
      )}

        {cause.text && <CauseCard run={run} cause={cause} />}
      </div>
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
        <ul className="cause-list">
          {shown.map((c) => (
            <li key={`${c.name} ${c.file ?? ""}`}>
              <div className="cause-main">
                <span className="cause-name">{c.name}</span>
                <span className="cause-where">{[c.file, c.sections.join(", ")].filter(Boolean).join(" in ")}</span>
              </div>
              <div className="cause-time">
                <span className="num">{Math.round(c.total)} ms</span>
                <span className="cause-count num">{c.count === 1 ? "once" : `${c.count} times`}</span>
              </div>
            </li>
          ))}
        </ul>
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
          {m.good !== undefined && (
            <ZoneBar
              zones={[{ to: m.good, level: "good" }, { to: m.poor!, level: "warn" }, { to: m.poor! * 1.5, level: "bad" }]}
              max={m.poor! * 1.5}
              format={m.format}
              marker={m.value}
            />
          )}
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
        </>
      )}
    </section>
  );
}

/** Heap over the run: one quiet line on a soft fill. Hover to read any moment. */
function Spark({ samples }: { samples: [number, number][] }) {
  const W = 400, H = 96;
  const wrap = useRef<HTMLDivElement>(null);
  const [hover, setHover] = useState<number | null>(null);
  const t0 = samples[0][0], span = samples[samples.length - 1][0] - t0 || 1;
  const vs = samples.map(([, v]) => v);
  const lo = Math.min(...vs) * 0.98, hi = Math.max(...vs) * 1.02;
  const xOf = (t: number) => (t - t0) / span;
  const yOf = (v: number) => 1 - (2 + ((v - lo) / (hi - lo || 1)) * (H - 4)) / H;
  const line = samples.map(([t, v], i) => `${i ? "L" : "M"}${(xOf(t) * W).toFixed(1)} ${(yOf(v) * H).toFixed(1)}`).join("");

  const move = (e: React.PointerEvent) => {
    const r = wrap.current!.getBoundingClientRect();
    const t = t0 + Math.max(0, Math.min(1, (e.clientX - r.left) / r.width)) * span;
    let best = 0;
    for (let i = 1; i < samples.length; i++) if (Math.abs(samples[i][0] - t) < Math.abs(samples[best][0] - t)) best = i;
    setHover(best);
  };

  const h = hover !== null ? samples[hover] : null;
  const change = h ? h[1] - samples[0][1] : 0;
  const left = h ? xOf(h[0]) : 0;
  return (
    <div>
      <div
        ref={wrap}
        className="spark-wrap"
        onPointerMove={move}
        onPointerDown={move}
        onPointerLeave={() => setHover(null)}
      >
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
        {h && (
          <>
            <div className="spark-line" style={{ left: `${left * 100}%` }} />
            <div className="spark-dot" style={{ left: `${left * 100}%`, top: `${yOf(h[1]) * 100}%` }} />
            <div className="tooltip" style={left > 0.6 ? { right: `${(1 - left) * 100}%`, marginRight: 12, top: 0 } : { left: `${left * 100}%`, marginLeft: 12, top: 0 }}>
              <div className="tooltip-title"><span className="num">{((h[0] - t0) / 1000).toFixed(1)} s</span></div>
              <div className="tooltip-row"><span>Heap</span><span className="num">{h[1].toFixed(1)} MB</span></div>
              <div className="tooltip-row"><span>Since start</span><span className="num">{`${change >= 0 ? "+" : ""}${change.toFixed(1)} MB`}</span></div>
            </div>
          </>
        )}
      </div>
      <div className="spark-axis num">
        <span>0 s</span>
        <span>{(span / 1000).toFixed(1)} s</span>
      </div>
    </div>
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

interface Stat {
  label: string;
  value: string;
  unit?: string;
  sub: string;
  level?: Level;
}

/** The numbers worth seeing first, as a row of small cards. */
function StatRow({ items }: { items: Stat[] }) {
  return (
    <div className="stat-row">
      {items.map((t) => (
        <div key={t.label} className="stat">
          <span className="stat-label">{t.level && <StatusIcon level={t.level} size={12} />}{t.label}</span>
          <span className="stat-value num">{t.value}{t.unit && <span>{t.unit}</span>}</span>
          <span className="stat-sub">{t.sub}</span>
        </div>
      ))}
    </div>
  );
}
