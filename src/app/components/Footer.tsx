import { Brand } from "./TopBar";
import { navigate } from "../lib";

/** Opens the setup row on the home page (and scrolls to it). */
export const OPEN_SETUP = "cadence:setup";

const REPO = "https://github.com/jacobcollado/cadence";

const GROUPS: { title: string; links: { label: string; href: string; internal?: boolean }[] }[] = [
  {
    title: "Product",
    links: [
      { label: "Docs", href: "/docs", internal: true },
      { label: "Demo", href: "/demo.html" },
      { label: "npm", href: "https://www.npmjs.com/package/cadence-probe" },
    ],
  },
  {
    title: "Follow",
    links: [
      { label: "GitHub", href: REPO },
      { label: "X", href: "https://x.com/byjacooob" },
    ],
  },
];

/** Footer on every page: who makes it, the license, and where to go next. */
export function Footer() {
  return (
    <footer className="footer">
      <div className="footer-inner">
        <div className="footer-about">
          <Brand />
          <p>A product of <a href="https://byinertia.com" target="_blank" rel="noopener">Inertia</a>.</p>
          <p>Open source under <a href={`${REPO}/blob/main/LICENSE`} target="_blank" rel="noopener">MIT</a>.</p>
        </div>
        {GROUPS.map((g) => (
          <nav key={g.title} className="footer-group" aria-label={g.title}>
            <h2>{g.title}</h2>
            <ul>
              {g.links.map((l) => (
                <li key={l.label}>
                  {l.internal
                    ? <a href={l.href} onClick={(e) => { e.preventDefault(); navigate(l.href); }}>{l.label}</a>
                    : <a href={l.href} target="_blank" rel="noopener">{l.label}</a>}
                </li>
              ))}
            </ul>
          </nav>
        ))}
      </div>
    </footer>
  );
}
