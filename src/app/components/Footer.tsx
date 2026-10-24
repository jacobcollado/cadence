import { navigate } from "../lib";
import { Icon, Mark } from "./ui";

export const OPEN_SETUP = "cadence:setup";

/** The footer on every page: who makes Cadence, and the links that lead somewhere. */
export function Footer() {
  const home = (e: React.MouseEvent) => {
    e.preventDefault();
    navigate("/");
  };
  // Set up lives on the home page, folded; this opens it there.
  const setup = (e: React.MouseEvent) => {
    e.preventDefault();
    if (location.pathname === "/") dispatchEvent(new Event(OPEN_SETUP));
    else navigate("/#setup");
  };
  return (
    <footer className="footer">
      <div className="footer-inner">
        <div className="footer-brand">
          <a href="/" className="brand" onClick={home}><Mark />Cadence</a>
          <p className="footer-by">
            A product of <a href="https://byinertia.com" target="_blank" rel="noopener">Inertia</a>
          </p>
        </div>
        <nav className="footer-links" aria-label="Footer">
          <a href="/" onClick={home}>Runs</a>
          <a href="/#setup" onClick={setup}>Set up</a>
          <a href="https://byinertia.com" target="_blank" rel="noopener" className="footer-ext">
            byinertia.com<Icon name="external" size={12} />
          </a>
        </nav>
      </div>
      <div className="footer-inner footer-base">
        <span className="num">© {new Date().getFullYear()} Inertia</span>
      </div>
    </footer>
  );
}
