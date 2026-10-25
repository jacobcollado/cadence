import { useEffect, useState, type ReactNode } from "react";
import { TopBar } from "../components/TopBar";
import { Install } from "../components/Install";
import { Icon, StatusIcon } from "../components/ui";

// The guide: one centered column in plain words, with the section list beside
// it on wide screens marking where you are.

const SECTIONS = [
  { id: "start", title: "Get started" },
  { id: "test", title: "Running a test" },
  { id: "report", title: "Reading a report" },
  { id: "compare", title: "Comparing devices" },
  { id: "tips", title: "Tips for useful results" },
  { id: "options", title: "Options" },
  { id: "privacy", title: "Privacy" },
];

function Section({ id, title, lede, children }: { id: string; title: string; lede?: ReactNode; children: ReactNode }) {
  return (
    <section id={id} className="doc-section">
      <h2 className="doc-h2">{title}</h2>
      {lede && <p className="doc-lede">{lede}</p>}
      {children}
    </section>
  );
}

function Code({ children }: { children: string }) {
  return <pre className="doc-code"><code>{children}</code></pre>;
}

/** A card with an icon, a title and a line or two. */
function Card({ icon, title, children }: { icon: ReactNode; title: string; children: ReactNode }) {
  return (
    <div className="doc-card">
      <span className="doc-card-icon">{icon}</span>
      <div className="doc-card-title">{title}</div>
      <p>{children}</p>
    </div>
  );
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
    <>
      <div className="shell doc-top"><TopBar /></div>
      <div className="doc-layout enter">
        <nav className="doc-nav" aria-label="On this page">
          <div className="doc-nav-title">On this page</div>
          {SECTIONS.map((s) => (
            <a key={s.id} href={`#${s.id}`} onClick={go(s.id)} aria-current={active === s.id || undefined}>{s.title}</a>
          ))}
        </nav>

        <article className="doc-body">
          <header className="doc-head">
            <h1 className="title">Docs</h1>
            <p className="lede">Add Cadence to your site, run a test on any device, and read what it found.</p>
          </header>

          <Section id="start" title="Get started" lede={<>Setup takes two lines of code. After that, any page of your site can be tested on any device by adding <code>?perf</code> to its address.</>}>
            <ol className="doc-steps">
              <li>
                <div className="doc-step-title">Install the package and add it to your root layout</div>
                <Install />
              </li>
              <li>
                <div className="doc-step-title">Open any page with <code>?perf</code> on the end</div>
                <p>Deploy, then visit a page like <code>yoursite.com/?perf</code>. A small Cadence panel appears in the corner. Visitors without <code>?perf</code> never load it.</p>
              </li>
              <li>
                <div className="doc-step-title">Pick a pass and press Start</div>
                <p>Cadence scrolls the page and records every frame.</p>
              </li>
              <li>
                <div className="doc-step-title">Press Open report</div>
                <p>The report opens on this site and is saved to your list of runs.</p>
              </li>
            </ol>
            <p>Not using React? Call <code>loadCadence()</code> once when your page starts:</p>
            <Code>{`import { loadCadence } from "cadence-probe";

loadCadence();`}</Code>
          </Section>

          <Section id="test" title="Running a test" lede="The panel shows the frame rate right now and which section of the page is in the middle of the screen. Choose one of four passes.">
            <div className="doc-cards">
              <Card icon={<Icon name="steady" />} title="Steady">Scrolls the whole page at one screen per second, like someone reading. Start here.</Card>
              <Card icon={<Icon name="fast" />} title="Fast">Scrolls at four screens per second. The hardest test, and the one most sites fail first.</Card>
              <Card icon={<Icon name="idle" />} title="Idle">Holds still for ten seconds. Catches animations and videos that keep the page busy even when nobody scrolls.</Card>
              <Card icon={<Icon name="manual" />} title="Manual">Records while you scroll and tap yourself, for up to two minutes. Use it for menus, forms and anything a script can't reach.</Card>
            </div>
            <p><strong>Added load</strong> gives the device extra work on every frame, so a fast laptop behaves more like a slower phone. Light adds a little, Heavy adds more. A real slower phone is still the better test.</p>
            <p>To turn Cadence off in a tab, close its panel, or open the page with <code>?perf=off</code>.</p>
          </Section>

          <Section id="report" title="Reading a report" lede="A report opens on three tiles. Each one is a part of the result, and each has a verdict. Select a tile to see its detail.">
            <div className="doc-cards doc-cards-3">
              <Card icon={<StatusIcon level="good" size={16} />} title="Smoothness">Rated Smooth, Uneven or Choppy, for the whole page and for each section, so you can see where it slowed down.</Card>
              <Card icon={<StatusIcon level="warn" size={16} />} title="Page load">How fast the page appeared, graded on the thresholds Google uses for Core Web Vitals.</Card>
              <Card icon={<StatusIcon level="bad" size={16} />} title="Memory">How much memory the page used during the run, and whether it kept growing.</Card>
            </div>
            <p>Every number has an <strong>i</strong> beside it that explains what it means and what counts as good. Three terms matter most:</p>
            <dl className="doc-list">
              <div><dt>Dropped frame</dt><dd>The screen was ready to show a new frame, but the page wasn't. The scroll visibly skips.</dd></div>
              <div><dt>Freeze</dt><dd>A single frame that took 50 ms or longer. The page stops for a moment you can see.</dd></div>
              <div><dt>Why it slowed down</dt><dd>When frames froze, Cadence checks what the browser was doing: running a script (named, with its file), working out layout, or drawing. That tells you where to start fixing.</dd></div>
            </dl>
          </Section>

          <Section id="compare" title="Comparing devices" lede="Every report you open is saved to the list of runs on the home page. Tick two or more and press Compare to see them side by side, section by section, with a sentence that names the biggest gap.">
            <p>A good set to compare: a recent iPhone, a mid-range Android, and a laptop.</p>
          </Section>

          <Section id="tips" title="Tips for useful results">
            <div className="doc-cards">
              <Card icon={<Icon name="check" />} title="Test on a real, slower phone">A mid-range Android tells you more than the newest iPhone, because most of your visitors don't have the newest phone.</Card>
              <Card icon={<Icon name="check" />} title="Run each pass twice">The first run can include the page still loading images and fonts. The second shows how it scrolls once it's settled.</Card>
              <Card icon={<Icon name="check" />} title="Turn off Low Power Mode">On iPhone it limits Safari to 30 frames per second. The report tells you when it spots this.</Card>
              <Card icon={<Icon name="check" />} title="Use Chrome for the why">Chrome and Edge report which script caused a freeze. Safari and Firefox show where it slowed down, but not the script behind it.</Card>
              <Card icon={<Icon name="check" />} title="Close other apps and tabs">They compete for the same processor and can make your site look slower than it is.</Card>
              <Card icon={<Icon name="check" />} title="Name your sections">Cadence names sections from their headings. To choose a name, add <code>data-cadence="Pricing"</code> to the section's element.</Card>
            </div>
          </Section>

          <Section id="options" title="Options" lede={<>Both <code>{"<Cadence />"}</code> and <code>loadCadence()</code> take the same options.</>}>
            <dl className="doc-list">
              <div><dt><code>param</code></dt><dd>The word that turns Cadence on in the address. The default is <code>"perf"</code>, as in <code>?perf</code>.</dd></div>
              <div><dt><code>enabled</code></dt><dd>Set to <code>false</code> to never load Cadence, for example on your live site if you only test on staging.</dd></div>
              <div><dt><code>app</code></dt><dd>Where reports open. The default is this site.</dd></div>
            </dl>
            <Code>{`<Cadence param="test" enabled={process.env.NODE_ENV !== "production"} />`}</Code>
          </Section>

          <Section id="privacy" title="Privacy">
            <div className="doc-callout">
              <span className="doc-card-icon"><Icon name="lock" /></span>
              <div>
                <p><strong>Cadence has no server and collects nothing.</strong> A run's results travel inside the report link itself, after the <code>#</code>, which browsers never send to any server. A report is saved only in the browser of whoever opens its link.</p>
                <p>A report link does include the page address, the device and browser, the names of your sections, and the names of slow scripts. Share report links the way you'd share a screenshot of your site.</p>
              </div>
            </div>
          </Section>
        </article>

        <span aria-hidden="true" />
      </div>
    </>
  );
}
