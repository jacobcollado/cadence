import { useEffect, useState } from "react";
import type { Run } from "../../shared/run";
import { LOADS } from "../../shared/run";
import {
  choppyBelow, computeStats, diagnose, FREEZE, MIN_SECTION_TIME, MODE_LABEL, RATING_LABEL, type Cause, type RunStats,
} from "../../shared/stats";
import { Bar, CopyButton, CountUp, Disclosure, Icon, RatingTag } from "../components/ui";
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

function ReportBody({ run, stats }: { run: Run; stats: RunStats }) {
  const [highlight, setHighlight] = useState<number | null>(null);
  const cause = diagnose(run, stats);
  const loadName = LOADS.find((l) => l.ms === run.load)?.label;
  const meta = [
    MODE_LABEL[run.mode],
    pathOf(run.url),
    when(run.at),
    `${run.hz} Hz screen`,
    run.load ? `${loadName} added load` : "",
  ].filter(Boolean).join(" · ");

  const rows = stats.sections.filter((s) => s.frames > 0);
  const notes: string[] = [];
  if (run.hz === 30) notes.push("The browser held frames to 30 fps. On an iPhone that usually means Low Power Mode is on.");
  if (run.load) notes.push(`The probe added ${run.load} ms of main-thread work to every frame, the way a slower processor would.`);
  const budget = Math.round(stats.interval);
  const lane = run.support.loaf && run.tasks.length > 0;

  return (
    <>
      <header className="report-head enter">
        <h1 className="subtitle" style={{ viewTransitionName: `name-${run.id}` }}>{run.device.name}</h1>
        <p className="meta">{meta}</p>
      </header>

      <section className="hero enter">
        <RatingTag rating={stats.rating} size={28} />
        <div className="hero-figure">
          <CountUp className="hero-value num" value={stats.fps} />
          <span className="hero-unit">fps out of {run.hz}</span>
        </div>
        <p className="hero-sentence">{stats.sentence}</p>
        {notes.map((n) => <p key={n} className="note">{n}</p>)}
      </section>

      <div className="enter">
        {rows.length > 0 && (
          <section className="card block">
            <div className="block-head">
              <div className="block-title">
                <h2 className="h2">Sections</h2>
                <p className="meta">Where on the page frames dropped, top to bottom.</p>
              </div>
            </div>
            <div className="table-scroll">
              <table className="table">
                <thead>
                  <tr>
                    <th>Section</th>
                    <th>Rating</th>
                    <th>Frame rate</th>
                    <th className="r wide">Dropped frames</th>
                    <th className="r wide">Longest frame</th>
                    <th className="r wide">On screen</th>
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
            <div className="block-title">
              <h2 className="h2">Frames</h2>
              <p className="meta">Each bar is one frame. Above the {budget} ms line, it missed its refresh.</p>
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

        <div style={{ marginTop: 16 }}>
          <Load run={run} />
          <Memory run={run} />
          <DeviceDetails run={run} />
          <Glossary run={run} />
          <Disclosure title="Data">
            <div className="actions">
              <button className="btn btn-secondary btn-icon-l" onClick={() => download(run)}>
                <Icon name="download" size={14} />Download JSON
              </button>
              <CopyButton text={() => location.href} />
            </div>
          </Disclosure>
        </div>
      </div>
    </>
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

function Load({ run }: { run: Run }) {
  const v = run.vitals;
  const na = `Not reported by ${run.device.browser}`;
  const items: [string, string | undefined, boolean][] = [
    ["Time to first byte", v.ttfb !== undefined ? `${v.ttfb} ms` : undefined, true],
    ["First paint", v.fcp !== undefined ? `${v.fcp} ms` : undefined, true],
    ["Largest paint", v.lcp !== undefined ? `${v.lcp} ms` : undefined, run.support.lcp],
    ["Layout shift", v.cls !== undefined ? v.cls.toFixed(3) : run.support.shifts ? "0.000" : undefined, run.support.shifts],
    ["Slowest interaction", v.inp !== undefined ? `${v.inp} ms` : run.support.inp ? "None yet" : undefined, run.support.inp],
    ["Elements", v.nodes?.toLocaleString(), true],
    ["Canvases", v.canvases?.toString(), true],
  ];
  return (
    <Disclosure title="Page load">
      <p className="note" style={{ marginBottom: 16 }}>Measured from when this tab first loaded the site.</p>
      <dl className="kv">
        {items.map(([k, val, supported]) => (
          <div key={k}>
            <dt>{k}</dt>
            <dd className={val === undefined ? "na" : "num"}>{val ?? (supported ? "Not measured" : na)}</dd>
          </div>
        ))}
      </dl>
    </Disclosure>
  );
}

function Memory({ run }: { run: Run }) {
  const mem = run.mem.map(([, v]) => v / 10);
  if (!run.support.memory || mem.length < 2) {
    return (
      <Disclosure title="Memory">
        <p className="note">{run.device.browser} doesn't expose memory use to pages.</p>
      </Disclosure>
    );
  }
  const start = mem[0], end = mem[mem.length - 1], peak = Math.max(...mem);
  const items: [string, string][] = [
    ["At start", `${start.toFixed(1)} MB`],
    ["Peak", `${peak.toFixed(1)} MB`],
    ["At end", `${end.toFixed(1)} MB`],
    ["Change", `${end - start >= 0 ? "+" : ""}${(end - start).toFixed(1)} MB`],
  ];
  return (
    <Disclosure title="Memory">
      <dl className="kv">
        {items.map(([k, v]) => <div key={k}><dt>{k}</dt><dd className="num">{v}</dd></div>)}
      </dl>
    </Disclosure>
  );
}

function DeviceDetails({ run }: { run: Run }) {
  const d = run.device;
  const items: [string, string | undefined][] = [
    ["Operating system", [d.os, d.osVersion].filter(Boolean).join(" ")],
    ["Browser", [d.browser, d.browserVersion].filter(Boolean).join(" ")],
    ["Model", d.model],
    ["Graphics", d.gpu],
    ["Processor cores", d.cores?.toString()],
    ["Memory", d.memory ? `${d.memory} GB or more` : undefined],
    ["Screen", `${d.screen[0]} × ${d.screen[1]} at ${d.dpr}x`],
    ["Viewport", `${d.viewport[0]} × ${d.viewport[1]}`],
    ["Refresh rate", `${run.hz} Hz`],
    ["Input", d.touch ? "Touch" : "Pointer"],
    ["Network", d.connection?.toUpperCase()],
    ["Reduced motion", d.reducedMotion ? "On" : "Off"],
  ];
  return (
    <Disclosure title="Device">
      <dl className="kv">
        {items.filter(([, v]) => v).map(([k, v]) => <div key={k}><dt>{k}</dt><dd>{v}</dd></div>)}
      </dl>
    </Disclosure>
  );
}

/** The methodology, in plain words, for anyone reading a report cold. */
function Glossary({ run }: { run: Run }) {
  const choppy = choppyBelow(run.hz);
  const terms: [string, string][] = [
    ["Frame rate", `How many new frames the page drew each second. The screen's refresh rate, ${run.hz} Hz on this device, is the most it can show.`],
    ["Dropped frame", "A refresh where the page wasn't ready, so the screen showed the last frame again. Scrolling looks like it skips."],
    ["Late and freeze", `A late frame missed its refresh by a little. A freeze took ${FREEZE} ms or more, long enough to see the page stop and jump.`],
    [
      `${RATING_LABEL.smooth}, ${RATING_LABEL.uneven.toLowerCase()}, ${RATING_LABEL.choppy.toLowerCase()}`,
      `Smooth holds 92% of the refresh rate, with 95% of frames on time and no freezes. Choppy is under ${choppy} fps, where motion stops looking continuous. Uneven is in between.`,
    ],
    ["Section", `The part of the page across the middle of the screen when a frame was drawn. Sections on screen under ${MIN_SECTION_TIME / 1000} s aren't rated.`],
    ["Busy main thread", `The main thread is where a page runs its scripts and works out style and layout. While it's busy, nothing new can be drawn. Chrome and Edge report each stretch over ${FREEZE} ms, with the script behind it. Safari and Firefox don't.`],
  ];
  return (
    <Disclosure title="How to read this">
      <dl className="glossary">
        {terms.map(([k, v]) => <div key={k}><dt>{k}</dt><dd>{v}</dd></div>)}
      </dl>
    </Disclosure>
  );
}
