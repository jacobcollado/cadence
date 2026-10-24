import { useEffect, useReducer } from "react";
import { onNavigate } from "./lib";
import { Home } from "./pages/Home";
import { Report } from "./pages/Report";
import { Compare } from "./pages/Compare";

export function App() {
  const [, refresh] = useReducer((n: number) => n + 1, 0);
  useEffect(() => onNavigate(refresh), []);

  const path = location.pathname;
  if (path.startsWith("/r")) return <Report key={location.hash} />;
  if (path.startsWith("/compare")) return <Compare key={location.hash} />;
  return <Home />;
}
