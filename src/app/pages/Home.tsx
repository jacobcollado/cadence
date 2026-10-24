import { useEffect, useRef, useState } from "react";
import { MODE_LABEL } from "../../shared/stats";
import { CopyButton, Icon, Qr, RatingTag, splitName, StatusIcon } from "../components/ui";
import { RATING_LEVEL } from "../../shared/vitals";
import { TopBar } from "../components/TopBar";
import { Install } from "../components/Install";
import { importFile, listRuns, navigate, pathOf, removeRun, saveRun, when, type Saved } from "../lib";
import { DUR, EASE, reducedMotion } from "../../shared/motion";

const TARGET = "cadence.target";

function withPerf(base: string): string {
  const raw = base.trim() || "https://byinertia.com";
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
      return localStorage.getItem(TARGET) ?? "https://byinertia.com";
    } catch {
      return "https://byinertia.com";
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

      <section className="start enter">
        <div className="start-copy">
          <h1 className="title">Find the frames a page drops, on any device.</h1>
          <p className="lede">
            Cadence records every frame while a page scrolls on a real phone, laptop or desktop, then shows which section stuttered and why.
          </p>
        </div>
        <div className="start-cards">
          <div className="card start-card">
            <div className="start-card-head">
              <h2 className="h2">Test on this device</h2>
              <p className="meta">Opens the page with the probe on. Run a pass, then open its report to keep it here.</p>
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
              <CopyButton text={() => link} label="Copy link" className="btn btn-lg btn-secondary btn-icon-l" />
              <a className="btn btn-lg btn-primary" href={link} target="_blank" rel="noopener">Open</a>
            </div>
          </div>
          <div className="card start-card qr-card">
            <div className="start-card-head">
              <h2 className="h2">Test on a phone</h2>
              <p className="meta">Scan to open the same page there.</p>
            </div>
            <Qr text={link} />
          </div>
        </div>
        <Setup />
      </section>

      <section className="enter">
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
          <div className="recess empty">
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
          </div>
        )}
      </section>

      {dragging && <div className="drop-veil">Drop a run to open it</div>}
    </div>
  );
}

/** Setup, folded away: one quiet row that opens the install steps when asked. */
function Setup() {
  const [open, setOpen] = useState(false);
  return (
    <div className="card setup" data-open={open || undefined}>
      <button className="setup-btn" aria-expanded={open} onClick={() => setOpen(!open)}>
        <span className="setup-icon"><Icon name="terminal" size={16} /></span>
        <span className="setup-title">Add Cadence to your site</span>
        <span className="setup-peek">npm install cadence-probe</span>
        <span className="tag-soon">Not published yet</span>
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
