/** Opens the setup row on the home page (and scrolls to it). */
export const OPEN_SETUP = "cadence:setup";

/** The footer on every page: one quiet line, centered. */
export function Footer() {
  return (
    <footer className="footer">
      <p>
        A product of <a href="https://byinertia.com" target="_blank" rel="noopener">Inertia</a>
      </p>
    </footer>
  );
}
