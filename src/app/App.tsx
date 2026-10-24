import { useEffect, useReducer } from "react";
import { onNavigate } from "./lib";
import { Home } from "./pages/Home";
import { Report } from "./pages/Report";
import { Compare } from "./pages/Compare";
import { Footer } from "./components/Footer";

export function App() {
  const [, refresh] = useReducer((n: number) => n + 1, 0);
  useEffect(() => onNavigate(refresh), []);

  const path = location.pathname;
  const page = path.startsWith("/r")
    ? <Report key={location.hash} />
    : path.startsWith("/compare")
      ? <Compare key={location.hash} />
      : <Home />;
  return (
    <>
      {page}
      <Footer />
    </>
  );
}
