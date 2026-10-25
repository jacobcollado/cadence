import { useEffect, useState, type ReactNode } from "react";
import { TopBar } from "../components/TopBar";
import { Install } from "../components/Install";

// The guide: one page, short sections, plain words. The section list stays in
// view on wide screens and marks where you are.

const SECTIONS = [
  { id: "start", title: "Get started" },
  { id: "test", title: "Running a test" },
  { id: "report", title: "Reading a report" },
  { id: "compare", title: "Comparing devices" },
  { id: "tips", title: "Tips for useful results" },
  { id: "options", title: "Options" },
  { id: "privacy", title: "Privacy" },
];

function Section({ id, title, children }: { id: string; title: string; children: ReactNode }) {
  return (
    <section id={id} className="doc-section">
      <h2 className="doc-h2">{title}</h2>
      {children}
    </section>
  );
}

function Code({ children }: { children: string }) {
  return <pre className="doc-code"><code>{children}</code></pre>;
}

export function Docs() {
  const [active, setActive] = useState(SECTIONS[0].id);

  // Mark the section nearest the top of the screen.
  useEffect(() => {
    const els = SECTIONS.map((s) => document.getElementById(s.id)!);
    const io = new IntersectionObserver(
      (entries) => {
        const seen = entries.filter((e) => e.isIntersecting).sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top);
        if (seen[0]) setActive(seen[0].target.id);
      },
      { rootMargin: "0px 0px -70% 0px" },
    );
    els.forEach((el) => io.observe(el));
    return () => io.disconnect();
  }, []);

  const go = (id: string) => (e: React.MouseEvent) => {
    e.preventDefault();
    document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" });
    history.replaceState(null, "", `#${id}`);
  };

  return (
    <div className="shell">
      <TopBar back />
      <header className="doc-head enter">
        <h1 className="title">Docs</h1>
        <p className="lede">Add Cadence to your site, run a test on any device, and read what it found.</p>
      </header>

      <div className="doc-layout enter">
        <nav className="doc-nav" aria-label="On this page">
          {SECTIONS.map((s) => (
            <a key={s.id} href={`#${s.id}`} onClick={go(s.id)} aria-current={active === s.id || undefined}>{s.title}</a>
          ))}
        </nav>

        <article className="doc-body">
          <Section id="start" title="Get started">
            <p>Setup takes two lines of code. After that, any page of your site can be tested on any device by adding <code>?perf</code> to its address.</p>
            <ol className="doc-steps">
              <li>
                <strong>Install the package</strong> in your project, then add it to your root layout.
                <Install />
              </li>
              <li>
                <strong>Deploy, then open any page with <code>?perf</code> on the end</strong>, like <code>yoursite.com/?perf</code>. A small Cadence panel appears in the corner. Visitors without <code>?perf</code> never load it.
              </li>
              <li>
                <strong>Pick a pass and press Start.</strong> Cadence scrolls the page and records every frame.
              </li>
              <li>
                <strong>Press Open report.</strong> The report opens on this site and is saved to your list of runs.
              </li>
            </ol>
            <p>Not using React? Call <code>loadCadence()</code> once when your page starts:</p>
            <Code>{`import { loadCadence } from "cadence-probe";

loadCadence();`}</Code>
          </Section>

          <Section id="test" title="Running a test">
            <p>The panel shows the frame rate right now and which section of the page is in the middle of the screen. Choose one of four passes:</p>
            <dl className="doc-list">
              <div><dt>Steady</dt><dd>Scrolls the whole page at one screen per second, like someone reading. Start here.</dd></div>
              <div><dt>Fast</dt><dd>Scrolls at four screens per second. The hardest test, and the one most sites fail first.</dd></div>
              <div><dt>Idle</dt><dd>Holds still for ten seconds. Catches animations and videos that keep the page busy even when nobody scrolls.</dd></div>
              <div><dt>Manual</dt><dd>Records while you scroll and tap yourself, for up to two minutes. Use it to test menus, forms and anything a script can't reach.</dd></div>
            </dl>
            <p><strong>Added load</strong> gives the device extra work on every frame, so a fast laptop behaves more like a slower phone. Light adds a little, Heavy adds more. A real slower phone is still the better test.</p>
            <p>To turn Cadence off in a tab, close its panel, or open the page with <code>?perf=off</code>.</p>
          </Section>

          <Section id="report" title="Reading a report">
            <p>A report opens on three tiles. Each one is a part of the result, and each has a verdict. Select a tile to see its detail.</p>
            <dl className="doc-list">
              <div><dt>Smoothness</dt><dd>How smoothly the page scrolled, rated Smooth, Uneven or Choppy. Below it, each section of the page gets its own rating, so you can see exactly where it slowed down.</dd></div>
              <div><dt>Page load</dt><dd>How fast the page appeared, graded against the thresholds Google uses for Core Web Vitals.</dd></div>
              <div><dt>Memory</dt><dd>How much memory the page used during the run, and whether it kept growing.</dd></div>
            </dl>
            <p>Every number has an <strong>i</strong> beside it that explains what it means and what counts as good. Three terms matter most:</p>
            <ul className="doc-bullets">
              <li><strong>Dropped frame.</strong> The screen was ready to show a new frame, but the page wasn't. The scroll visibly skips.</li>
              <li><strong>Freeze.</strong> A single frame that took 50 ms or longer. The page stops for a moment you can see.</li>
              <li><strong>Why it slowed down.</strong> When frames froze, Cadence checks what the browser was doing: running a script (named, with its file), working out layout, or drawing. That tells you where to start fixing.</li>
            </ul>
          </Section>

          <Section id="compare" title="Comparing devices">
            <p>Every report you open is saved to the list of runs on the home page. Tick two or more and press Compare to see them side by side, section by section, with a sentence that names the biggest gap.</p>
            <p>A good set to compare: a recent iPhone, a mid-range Android, and a laptop.</p>
          </Section>

          <Section id="tips" title="Tips for useful results">
            <ul className="doc-bullets">
              <li><strong>Test on a real, slower phone.</strong> A mid-range Android tells you more than the newest iPhone, because most of your visitors don't have the newest phone.</li>
              <li><strong>Run each pass twice.</strong> The first run can include the page still loading images and fonts. The second shows how it scrolls once it's settled.</li>
              <li><strong>Turn off Low Power Mode on iPhone.</strong> It limits Safari to 30 frames per second. The report tells you when it spots this.</li>
              <li><strong>Use Chrome for the why.</strong> Chrome and Edge report which script caused a freeze. Safari and Firefox don't, so their reports show where it slowed down, but not the script behind it.</li>
              <li><strong>Close other apps and tabs.</strong> They compete for the same processor and can make your site look slower than it is.</li>
              <li><strong>Name your sections.</strong> Cadence names sections from their headings. To choose the name yourself, add <code>data-cadence="Pricing"</code> to the section's element.</li>
            </ul>
          </Section>

          <Section id="options" title="Options">
            <p>Both <code>{"<Cadence />"}</code> and <code>loadCadence()</code> take the same options.</p>
            <dl className="doc-list">
              <div><dt><code>param</code></dt><dd>The word that turns Cadence on in the address. The default is <code>"perf"</code>, as in <code>?perf</code>.</dd></div>
              <div><dt><code>enabled</code></dt><dd>Set to <code>false</code> to never load Cadence, for example on your live site if you only test on staging.</dd></div>
              <div><dt><code>app</code></dt><dd>Where reports open. The default is this site.</dd></div>
            </dl>
            <Code>{`<Cadence param="test" enabled={process.env.NODE_ENV !== "production"} />`}</Code>
          </Section>

          <Section id="privacy" title="Privacy">
            <p>Cadence has no server and collects nothing. A run's results travel inside the report link itself, after the <code>#</code>, which browsers never send to any server. A report is saved only in the browser of whoever opens its link.</p>
            <p>A report link does include the page address, the device and browser, the names of your sections, and the names of slow scripts. Share report links the way you'd share a screenshot of your site.</p>
          </Section>
        </article>
      </div>
    </div>
  );
}
