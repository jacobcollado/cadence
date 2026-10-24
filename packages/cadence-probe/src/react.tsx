import { useEffect } from "react";
import { loadCadence, type CadenceOptions } from "./index";

/**
 * Drop into your root layout. Renders nothing; loads the probe only when the
 * address has ?perf.
 */
export function Cadence(props: CadenceOptions) {
  useEffect(() => {
    loadCadence(props);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps
  return null;
}

export { loadCadence, wantsCadence, type CadenceOptions } from "./index";
