import { useEffect, useReducer } from "react";
import { Analytics } from "@vercel/analytics/react";
import { onNavigate } from "./lib";
import { Home } from "./pages/Home";
import { Report } from "./pages/Report";
import { Compare } from "./pages/Compare";
import { Footer } from "./components/Footer";
import { Banner } from "./components/Banner";
import { Docs } from "./pages/Docs";

export function App() {
  const [, refresh] = useReducer((n: number) => n + 1, 0);
  useEffect(() => onNavigate(refresh), []);

  const path = location.pathname;
  useEffect(() => {
    document.title = path.startsWith("/docs") ? "Cadence docs"
      : path.startsWith("/r") ? "Cadence report"
      : path.startsWith("/compare") ? "Cadence comparison"
      : "Cadence: stress test your site on real devices";
  }, [path]);
  const page = path.startsWith("/docs")
    ? <Docs />
    : path.startsWith("/r")
    ? <Report key={location.hash} />
    : path.startsWith("/compare")
      ? <Compare key={location.hash} />
      : <Home />;
  return (
    <>
      <Banner />
      {page}
      <Footer />
      {/* Page views only. The run lives after the #, so it's cut before anything is sent. */}
      <Analytics beforeSend={(e) => ({ ...e, url: e.url.split("#")[0] })} />
    </>
  );
}
