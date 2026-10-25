import type { CadenceOptions } from "./index";

/** Drop into your root layout. Renders nothing; loads the probe only when the address has ?perf. */
export declare function Cadence(props: CadenceOptions): null;

export { loadCadence, wantsCadence, type CadenceOptions } from "./index";
