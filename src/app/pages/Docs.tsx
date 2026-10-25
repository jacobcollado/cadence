import { useEffect, useLayoutEffect, useRef, useState, type ComponentProps, type CSSProperties, type ReactNode } from "react";
import { TopBar } from "../components/TopBar";
import { Install } from "../components/Install";
import { Icon } from "../components/ui";
import { CauseTags, CompareSpecimen, FrameStrip, PassMeter, TilesSpecimen } from "../components/DocVisuals";
import { reducedMotion } from "../../shared/motion";
import { tint } from "../glass";

// The docs, in the same frame as the rest of the site: the section list in
// its own lane on wide screens, marking where you are, and the sections as
// cells beside it. Each section has a glass tint, stepping through the
// spectrum, shared by its heading and its place in the list.

const SECTIONS: { id: string; title: string; icon: IconName }[] = [
  { id: "start", title: "Get started", icon: "terminal" },
  { id: "test", title: "Running a test", icon: "steady" },
  { id: "report", title: "Reading a report", icon: "file" },
  { id: "compare", title: "Comparing devices", icon: "compare" },
  { id: "tips", title: "Tips for useful results", icon: "info" },
  { id: "options", title: "Options", icon: "code" },
  { id: "privacy", title: "Privacy", icon: "lock" },
];

type IconName = ComponentProps<typeof Icon>["name"];

/** A section's tint, by its place in the list. */
const sectionTint = (id: string) => tint(SECTIONS.findIndex((s) => s.id === id) / (SECTIONS.length - 1));

function Section({ id, title, lede, children }: { id: string; title: string; lede?: ReactNode; children: ReactNode }) {
  const icon = SECTIONS.find((s) => s.id === id)!.icon;
  return (
    <section id={id} className="doc-section">
      <div className="doc-h2-row">
        <span className="glass free-tile" style={{ "--c": sectionTint(id) } as CSSProperties}><Icon name={icon} size={16} /></span>
        <h2 className="doc-h2">{title}</h2>
      </div>
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
      <span className="glass doc-card-icon">{icon}</span>
      <div className="doc-card-title">{title}</div>
      <p>{children}</p>
    </div>
  );
}

const CIPHER = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_";
const LENGTH = 72;

/**
 * A report link, drawn so its two halves read at a glance: the address the
 * server sees, and the encoded run after the # that it never does. A few
 * characters re-scramble at a time.
 */
function CipherLink() {
  // The first bracket spans exactly the address part, measured.
  const host = useRef<HTMLSpanElement>(null);
  const [hostW, setHostW] = useState(0);
  useLayoutEffect(() => {
    const el = host.current!;
    const ro = new ResizeObserver(() => setHostW(el.offsetWidth));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  const [chars, setChars] = useState(() => Array.from({ length: LENGTH }, (_, i) => CIPHER[(i * 37 + 11) % CIPHER.length]));
  useEffect(() => {
    if (reducedMotion()) return;
    const id = setInterval(() => {
      setChars((c) => {
        const next = c.slice();
        for (let k = 0; k < 4; k++) next[Math.floor(Math.random() * LENGTH)] = CIPHER[Math.floor(Math.random() * CIPHER.length)];
        return next;
      });
    }, 140);
    return () => clearInterval(id);
  }, []);
  return (
    <figure className="cipher" style={{ "--host-w": `${hostW}px` } as React.CSSProperties} aria-label="A report link: the address is sent to the server, the run after the # never leaves the browser">
      <div className="cipher-line" aria-hidden="true">
        <span ref={host} className="cipher-host">{location.host}/r</span>
        <span className="cipher-hash">#</span>
        <span className="cipher-data">{chars.join("")}</span>
      </div>
      <div className="cipher-keys" aria-hidden="true">
        <span className="cipher-key">Sent to the server</span>
        <span className="cipher-key cipher-key-private"><Icon name="lock" size={12} />Never leaves the browser</span>
      </div>
    </figure>
  );
}

export function Docs() {
  const [active, setActive] = useState(SECTIONS[0].id);
  // The pinned list on phones, closed until tapped.
  const [tocOpen, setTocOpen] = useState(false);
  // Mark the last section whose top has passed the upper part of the screen.
  useEffect(() => {
    const els = SECTIONS.map((s) => document.getElementById(s.id)!);
    let raf = 0;
    const update = () => {
      raf = 0;
      const line = innerHeight * 0.25;
      let current = els[0];
      for (const el of els) if (el.getBoundingClientRect().top <= line) current = el;
      setActive(current.id);
    };
    const onScroll = () => { if (!raf) raf = requestAnimationFrame(update); };
    update();
    addEventListener("scroll", onScroll, { passive: true });
    return () => { removeEventListener("scroll", onScroll); cancelAnimationFrame(raf); };
  }, []);

  const go = (id: string) => (e: React.MouseEvent) => {
    e.preventDefault();
    setTocOpen(false);
    document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" });
    history.replaceState(null, "", `#${id}`);
  };

  return (
    <div className="shell docs">
      <TopBar />
      <div className="rails doc-frame enter">
        <aside className="doc-side">
          <nav id="doc-nav" className="doc-nav" aria-label="On this page">
            {SECTIONS.map((s) => (
              <a key={s.id} href={`#${s.id}`} onClick={go(s.id)} aria-current={active === s.id || undefined} style={{ "--c": sectionTint(s.id) } as CSSProperties}>{s.title}</a>
            ))}
          </nav>
        </aside>

        <article className="doc-body">
          <div className="doc-fade doc-fade-wide" aria-hidden="true" />
          <header className="doc-head">
            <h1 className="title">Docs</h1>
            <p className="lede">Add Cadence to your site, run a test on any device, and read what it found.</p>
          </header>

          {/* Phones: the section list, under the title, then pinned to the top once you scroll to it. */}
          <div className="doc-toc" data-open={tocOpen || undefined}>
            <button className="doc-toc-btn" aria-expanded={tocOpen} aria-controls="doc-toc-list" onClick={() => setTocOpen(!tocOpen)}>
              <span className="doc-toc-current">{SECTIONS.find((s) => s.id === active)?.title}</span>
              <Icon name="chevron" />
            </button>
            <div className="disclosure-body" data-open={tocOpen || undefined}>
              <div>
                <nav id="doc-toc-list" className="doc-toc-list" aria-label="On this page">
                  {SECTIONS.map((s) => (
                    <a key={s.id} href={`#${s.id}`} onClick={go(s.id)} aria-current={active === s.id || undefined} tabIndex={tocOpen ? undefined : -1}>{s.title}</a>
                  ))}
                </nav>
              </div>
            </div>
          </div>
          {/* Text scrolling under the top edge fades out instead of cutting off. */}
          <div className="doc-fade doc-fade-phone" aria-hidden="true" />

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
              <Card icon={<PassMeter pass="steady" />} title="Steady">Scrolls the whole page at one screen per second, like someone reading. Start here.</Card>
              <Card icon={<PassMeter pass="fast" />} title="Fast">Scrolls at four screens per second. The hardest test, and the one most sites fail first.</Card>
              <Card icon={<PassMeter pass="idle" />} title="Idle">Holds still for ten seconds. Catches animations and videos that keep the page busy even when nobody scrolls.</Card>
              <Card icon={<PassMeter pass="manual" />} title="Manual">Records while you scroll and tap yourself, for up to two minutes. Use it for menus, forms and anything a script can't reach.</Card>
            </div>
            <p><strong>Added load</strong> gives the device extra work on every frame, so a fast laptop behaves more like a slower phone. Light adds a little, Heavy adds more. A real slower phone is still the better test.</p>
            <p>To turn Cadence off in a tab, close its panel, or open the page with <code>?perf=off</code>.</p>
          </Section>

          <Section id="report" title="Reading a report" lede="A report opens on three tiles. Each one is a part of the result, and each has a verdict. Select a tile to see its detail.">
            <TilesSpecimen />
            <p>Every number in a report has an <strong>i</strong> beside it that explains what it means and what counts as good.</p>
            <h3 className="doc-h3">Scores</h3>
            <p>Like Lighthouse, a report has a score out of 100, and each tile has its own. 90 and up is good, 50 to 89 needs work, under 50 is poor: the same three levels as every other grade in Cadence, so a score never disagrees with its word.</p>
            <p>Each measurement is scored on Lighthouse's curve, set so that Cadence's good threshold scores 90 and its poor threshold scores 50. <strong>Smoothness</strong> weighs the frame rate at half, then the share of frames on time and the longest frame. <strong>Page load</strong> weighs largest paint and layout shift most, as Lighthouse does. <strong>Memory</strong> scores how much the heap and the page's elements grew. The overall score weighs smoothness at half, page load at 30 and memory at 20, counting only what was measured.</p>
            <h3 className="doc-h3">Three terms that matter most</h3>
            <div className="doc-cards doc-cards-3">
              <div className="doc-term">
                <FrameStrip kind="dropped" />
                <div className="doc-term-title">Dropped frame</div>
                <p>The screen was ready for a new frame, but the page wasn't. The scroll visibly skips.</p>
              </div>
              <div className="doc-term">
                <FrameStrip kind="freeze" />
                <div className="doc-term-title">Freeze</div>
                <p>One frame that took 50 ms or longer. The page stops for a moment you can see.</p>
              </div>
              <div className="doc-term">
                <CauseTags />
                <div className="doc-term-title">Why it slowed down</div>
                <p>What the browser was busy with when frames froze: a script (named, with its file), layout, or drawing.</p>
              </div>
            </div>
          </Section>

          <Section id="compare" title="Comparing devices" lede="Every report you open is saved to the list of runs on the home page. Tick two or more and press Compare to see them side by side, section by section, with a sentence that names the biggest gap.">
            <CompareSpecimen />
            <p>A good set to compare: a recent iPhone, a mid-range Android, and a laptop.</p>
          </Section>

          <Section id="tips" title="Tips for useful results">
            <div className="doc-cards">
              <Card icon={<Icon name="phone" />} title="Test on a real, slower phone">A mid-range Android tells you more than the newest iPhone, because most of your visitors don't have the newest phone.</Card>
              <Card icon={<Icon name="repeat" />} title="Run each pass twice">The first run can include the page still loading images and fonts. The second shows how it scrolls once it's settled.</Card>
              <Card icon={<Icon name="battery" />} title="Turn off Low Power Mode">On iPhone it limits Safari to 30 frames per second. The report tells you when it spots this.</Card>
              <Card icon={<Icon name="code" />} title="Use Chrome for the why">Chrome and Edge report which script caused a freeze. Safari and Firefox show where it slowed down, but not the script behind it.</Card>
              <Card icon={<Icon name="layers" />} title="Close other apps and tabs">They compete for the same processor and can make your site look slower than it is.</Card>
              <Card icon={<Icon name="tag" />} title="Name your sections">Cadence names sections from their headings. To choose a name, add <code>data-cadence="Pricing"</code> to the section's element.</Card>
            </div>
          </Section>

          <Section id="options" title="Options" lede={<>Both <code>{"<Cadence />"}</code> and <code>loadCadence()</code> take the same options.</>}>
            <div className="props">
              <div className="props-row props-head"><span>Option</span><span>Type</span><span>Default</span></div>
              <div className="props-row">
                <code>param</code><code className="props-type">string</code><code className="props-default">"perf"</code>
                <p>The word that turns Cadence on in the address, as in <code>?perf</code>.</p>
              </div>
              <div className="props-row">
                <code>enabled</code><code className="props-type">boolean</code><code className="props-default">true</code>
                <p>Set to <code>false</code> to never load Cadence, for example on your live site if you only test on staging.</p>
              </div>
              <div className="props-row">
                <code>app</code><code className="props-type">string</code><span className="props-plain">This site</span>
                <p>Where reports open.</p>
              </div>
            </div>
            <Code>{`// Only on staging, turned on with ?test
<Cadence param="test" enabled={process.env.NODE_ENV !== "production"} />`}</Code>
          </Section>

          <Section id="privacy" title="Privacy" lede="Cadence has no server and never sees a run. A run travels inside its own report link.">
            <CipherLink />
            <p>Everything after the <code>#</code> stays in the browser. Browsers never send it to any server, so a report is saved only in the browser of whoever opens its link.</p>
            <div className="doc-contains">
              <div className="doc-contains-title">What a report link contains</div>
              <div className="doc-tags">
                {["Page address", "Device and browser", "Section names", "Slow script names"].map((t) => <span key={t} className="doc-tag">{t}</span>)}
              </div>
              <p>Share report links the way you'd share a screenshot of your site.</p>
            </div>
            <p>The site counts page visits with Vercel Analytics, which uses no cookies. Report addresses are counted without the part after the <code>#</code>, so the run itself is never sent.</p>
            <h3 className="doc-h3">Where runs are saved</h3>
            <p>Opening a report saves the run to that browser's run list, on that device only. Clearing site data or a private window removes it, and Safari clears it after seven days without a visit. The report link keeps the whole run, so copy it to keep a run for good or to open it elsewhere.</p>
          </Section>
        </article>
      </div>
    </div>
  );
}
