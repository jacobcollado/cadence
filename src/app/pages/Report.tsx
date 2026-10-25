import { useEffect, useRef, useState, type ReactNode } from "react";
import type { Run } from "../../shared/run";
import { LOADS } from "../../shared/run";
import {
  choppyBelow, computeStats, diagnose, FREEZE, MIN_SECTION_TIME, MODE_LABEL, RATING_LABEL, type Cause, type RunStats,
} from "../../shared/stats";
import { Bar, CopyButton, CountUp, Icon, Info, RatingTag, splitName, StatusIcon, StatusTag, ZoneBar } from "../components/ui";
import { heapMissing, LEVEL_LABEL, memory, pageLoad, RATING_LEVEL, type Level, type MemoryReport, type Metric } from "../../shared/vitals";
import { Timeline } from "../components/Timeline";
import { TopBar } from "../components/TopBar";
import { reportMarkdown } from "../markdown";
import { ADVICE, CAUSE_LABEL, scrollTip } from "../../shared/advice";
import { decodeRun, dismissSavedNote, download, pathOf, saveRun, savedNoteSeen, when } from "../lib";

type State = { run: Run; stats: RunStats } | { error: string } | null;

export function Report() {
  const data = location.hash.slice(1);
  const [state, setState] = useState<State>(null);

  useEffect(() => {
    if (!data) return setState({ error: "This link doesn't include a run." });
    decodeRun(data)
      .then((run) => {
        // Example reports from the home page stay out of the visitor's own runs.
        if (!new URLSearchParams(location.search).has("example")) saveRun(run, data);
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
  const name = splitName(run.device.name);

  // Context that changes how to read every tab, so it sits above them.
  const flags = runFlags(run);

  // The tab lives in the address, so a copied link opens on the same view.
  const pick = (t: Tab) => {
    setTab(t);
    const url = new URL(location.href);
    if (t === "smooth") url.searchParams.delete("tab");
    else url.searchParams.set("tab", t);
    history.replaceState(null, "", url);
  };

  return (
    <>
      <header className="report-head enter">
        <div className="report-title">
          <h1 className="subtitle" style={{ viewTransitionName: `name-${run.id}` }}>{name.device}</h1>
          <p className="report-page">{pathOf(run.url)}</p>
          {flags.length > 0 && (
            <div className="report-flags">
              {flags.map((f) => (
                <span key={f.label} className="flag">
                  {f.label}
                  <Info title={f.label}><p>{f.text}</p></Info>
                </span>
              ))}
            </div>
          )}
        </div>
        <div className="actions">
          <DeviceButton run={run} />
          <CopyButton text={() => reportMarkdown(run, stats, cause, metrics, mem, location.href)} label="Copy as Markdown" icon="markdown" />
          <CopyButton text={() => location.href} />
        </div>
      </header>

      <SavedNote />

      <div className="enter">
        <Overview run={run} stats={stats} metrics={metrics} mem={mem} tab={tab} onPick={pick} />
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
                mem.heap
                  ? { label: "Heap peak", value: mem.heap.peak.toFixed(1), unit: "MB", sub: "The most it held" }
                  : { label: "Heap", value: "None", sub: "Not measured" },
                mem.heap
                  ? { label: "Heap change", value: signed(mem.heap.change.toFixed(1)), unit: "MB", sub: mem.heap.grew ? "Growing" : "Steady", level: mem.heap.grew ? "warn" : "good" }
                  : { label: "Heap change", value: "None", sub: "Not measured" },
                mem.nodes
                  ? { label: "Page elements", value: mem.nodes.end.toLocaleString(), sub: "At the end of the run" }
                  : { label: "Page elements", value: "None", sub: "Not recorded" },
                mem.nodes
                  ? { label: "Element change", value: signed(mem.nodes.change.toLocaleString()), sub: mem.nodes.grew ? "Growing" : "Steady", level: mem.nodes.grew ? "warn" : "good" }
                  : { label: "Element change", value: "None", sub: "Not recorded" },
              ]} />
            )}
            <MemoryCard run={run} m={mem} />
          </>
        )}
      </div>
    </>
  );
}

/**
 * Shown once, on the first report: runs live in this browser only, and the
 * link is the way to keep one. Folds open on arrival and away when dismissed.
 */
function SavedNote() {
  const [shown] = useState(() => !savedNoteSeen() && !new URLSearchParams(location.search).has("example"));
  const [open, setOpen] = useState(false);
  useEffect(() => {
    if (!shown) return;
    const id = requestAnimationFrame(() => setOpen(true));
    return () => cancelAnimationFrame(id);
  }, [shown]);
  if (!shown) return null;
  const close = () => {
    setOpen(false);
    dismissSavedNote();
  };
  return (
    <div className="saved-fold" data-open={open || undefined} aria-hidden={!open}>
      <div>
        <div className="saved-note" role="note">
          <span className="saved-icon"><Icon name="info" size={16} /></span>
          <p>Saved in this browser only. Copy the link to keep it anywhere.</p>
          <div className="saved-actions">
            <CopyButton text={() => location.href} className="tag-btn" />
            <button className="icon-btn" aria-label="Dismiss" onClick={close}><Icon name="close" size={14} /></button>
          </div>
        </div>
      </div>
    </div>
  );
}

/** One tile per graded category. Each tile is also the tab for its part. */
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
      value: headline?.value !== undefined
        ? <><span className="num">{headline.display}</span>{headline.key === "nodes" && <span className="tile-unit">elements</span>}</>
        : <span className="tile-none">Not reported</span>,
      detail: !graded.length
        ? `${run.device.browser} doesn't report it`
        : loadCounts.length
          ? `${headline!.name}, ${loadCounts.map(([l, n]) => `${n} ${LEVEL_LABEL[l].toLowerCase()}`).join(", ")}`
          : `${headline?.name ?? "Every metric"}, all good`,
    },
    {
      id: "memory", label: "Memory", level: mem?.level,
      value: mem?.heap
        ? <><span className="num">{mem.heap.peak.toFixed(1)}</span><span className="tile-unit">MB</span></>
        : mem?.nodes
          ? <><span className="num">{mem.nodes.end.toLocaleString()}</span><span className="tile-unit">elements</span></>
          : <span className="tile-none">{run.support.memory ? "Not measured" : "Not reported"}</span>,
      detail: !mem ? (run.support.memory ? "Not measured on this run" : `${run.device.browser} doesn't report it`)
        : `${mem.level === "good" ? "Steady" : "Growing"}, ${mem.heap ? "at its peak" : "page elements"}`,
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
        { label: "Dropped frames", value: `${stats.dropped}`, sub: `Of ${(stats.frames + stats.dropped).toLocaleString()} frames`, level: stats.dropped ? "warn" : "good" },
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

function memoryMissing(run: Run): string {
  return heapMissing(run) || "Memory wasn't measured on this run.";
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
        <Icon name="info" size={14} />Details
      </button>
      {open && (
        <div className="popover" role="dialog" aria-label="Details">
          <DevicePanel run={run} />
        </div>
      )}
    </div>
  );
}

function CauseCard({ run, cause }: { run: Run; cause: Cause }) {
  const kind = cause.kind ?? "unknown";
  const shown = cause.culprits.slice(0, 4);
  const rest = cause.culprits.length - shown.length;
  const parts = [
    { kind: "script" as const, n: cause.scripted },
    { kind: "layout" as const, n: cause.laidOut },
    { kind: "drawing" as const, n: cause.drawn },
  ].filter((p) => p.n > 0);
  const total = parts.reduce((a, p) => a + p.n, 0);
  const probe = cause.culprits.some((c) => c.name === "Cadence" || c.file === "Cadence");
  // A scroll handler at the top gets its own first tip, with its real numbers.
  const top = cause.culprits[0];
  const tips = kind === "script" && top && /scroll/i.test(top.name) ? [scrollTip(top.name, top.count, top.total), ...ADVICE.script.slice(0, 2)] : ADVICE[kind];
  return (
    <section className="card block cause-card">
      <div className="block-head">
        <div className="block-title"><h2 className="h2">Why it slowed down</h2></div>
        <span className="cause-kind" data-kind={kind}><Icon name={CAUSE_ICON[kind]} size={12} />{CAUSE_LABEL[kind]}</span>
      </div>
      <p className="cause">{cause.text}</p>

      {parts.length > 1 && (
        <div className="cause-split">
          <div className="cause-split-bar" aria-hidden="true">
            {parts.map((p) => <span key={p.kind} data-kind={p.kind} style={{ flexGrow: p.n }} />)}
          </div>
          <div className="cause-split-keys">
            {parts.map((p) => (
              <span key={p.kind}><i data-kind={p.kind} />{CAUSE_LABEL[p.kind]}<span className="num">{Math.round((p.n / total) * 100)}%</span></span>
            ))}
          </div>
        </div>
      )}

      {shown.length > 0 && (
        <>
          <h3 className="cause-sub">What ran</h3>
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
          {rest > 0 && <p className="note cause-more">And {rest} more, in the downloaded data.</p>}
          {probe && <p className="note cause-more">Scripts named Cadence are the probe itself{run.load ? ", including the added load" : ""}.</p>}
        </>
      )}

      <h3 className="cause-sub">How to fix it</h3>
      <ol className="fix-list">
        {tips.map((t) => (
          <li key={t.title}>
            <span className="fix-title">{t.title}</span>
            <span className="fix-detail">{withCode(t.detail)}</span>
          </li>
        ))}
      </ol>
    </section>
  );
}

const CAUSE_ICON = { script: "code", layout: "layout", drawing: "drawing", steady: "repeat", unknown: "info" } as const;

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
            <p>Two signs of a leak, sampled twice a second: the JavaScript heap, which is what the page's scripts hold on to, and the number of elements on the page.</p>
            <p>Some rise and fall is normal. Memory that only climbs is a leak, and on phones it ends with the tab reloading. Growing means the heap rose more than 10 MB, or the page gained more than 500 elements, and either rose by more than a fifth.</p>
            <p>Most pages can only read a rounded heap figure from Chrome that it rarely refreshes. When it doesn't move, Cadence leaves it out rather than call it steady.</p>
          </Info>
        </div>
        {m && <StatusTag level={m.level} label={m.level === "good" ? "Steady" : "Growing"} />}
      </div>
      {!m ? (
        <p className="cause">{memoryMissing(run)}</p>
      ) : (
        <>
          <p className="cause">{m.text}</p>
          {m.heap && <Spark title="Heap" samples={m.heap.samples} format={(v) => `${v.toFixed(1)} MB`} />}
          {m.nodes && <Spark title="Page elements" samples={m.nodes.samples} format={(v) => Math.round(v).toLocaleString()} />}
          {!m.heap && m.heapNote && <p className="note mem-note">{m.heapNote}</p>}
        </>
      )}
    </section>
  );
}

function signed(v: string): string {
  return v.startsWith("-") ? v : `+${v}`;
}

/** One measure over the run. Hover to read any point. */
function Spark({ title, samples, format }: { title: string; samples: [number, number][]; format: (v: number) => string }) {
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
      <div className="spark-title">{title}</div>
      <div
        ref={wrap}
        className="spark-wrap"
        onPointerMove={move}
        onPointerDown={move}
        onPointerLeave={() => setHover(null)}
      >
        <svg className="spark" viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" role="img" aria-label={`${title} over the run`}>
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
              <div className="tooltip-row"><span>{title}</span><span className="num">{format(h[1])}</span></div>
              <div className="tooltip-row"><span>Since start</span><span className="num">{signed(format(change))}</span></div>
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
interface Flag {
  label: string;
  /** The full explanation, behind the tag's "i". */
  text: string;
}

/** Conditions that change how to read the whole report, shown as tags in the header. */
function runFlags(run: Run): Flag[] {
  const d = run.device;
  const flags: Flag[] = [];
  const loadName = LOADS.find((l) => l.ms === run.load)?.label;
  if (run.load) flags.push({ label: `${loadName ?? "Added"} load`, text: `The probe added ${run.load} ms of main-thread work to every frame, the way a slower processor would. Frame rates here run lower than this device would manage on its own.` });
  if (run.hz === 30) flags.push({ label: "Held to 30 fps", text: "The browser held frames to 30 fps. On an iPhone that usually means Low Power Mode is on. Turn it off and run again for a full result." });
  if (d.reducedMotion) flags.push({ label: "Reduced motion", text: "Reduced motion was on, so the site may have skipped animation. Most visitors see more motion than this run did." });
  if (d.connection && /2g|3g/.test(d.connection)) flags.push({ label: `${d.connection.toUpperCase()} network`, text: `On a ${d.connection.toUpperCase()} connection, so load times run long.` });
  if ((d.memory && d.memory <= 4) || (d.cores && d.cores <= 4)) flags.push({ label: "Lower-end device", text: "A lower-end device, which makes this a good stress test." });
  return flags;
}

function DevicePanel({ run }: { run: Run }) {
  const d = run.device;
  const loadName = LOADS.find((l) => l.ms === run.load)?.label;
  const groups: [string, [string, string | undefined][]][] = [
    ["Run", [
      ["Page", pathOf(run.url)],
      ["Pass", MODE_LABEL[run.mode]],
      ["Time", when(run.at)],
      ["Added load", run.load ? loadName ?? `${run.load} ms` : "None"],
    ]],
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
      <div className="popover-head popover-head-row">
        <h2 className="h2">Details</h2>
        <button className="btn btn-secondary btn-icon-l" onClick={() => download(run)}>
          <Icon name="download" size={14} />Download JSON
        </button>
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

/** Text with `code` spans set as code. */
function withCode(text: string): ReactNode {
  return text.split(/(`[^`]+`)/).map((part, i) => (part.startsWith("`") ? <code key={i}>{part.slice(1, -1)}</code> : part));
}
