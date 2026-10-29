export interface CadenceOptions {
  /** The query switch that turns the probe on. Default "perf", as in ?perf. */
  param?: string;
  /** Where reports open. Default "https://cad-ence.dev". */
  app?: string;
  /** Set false to never load, for example outside staging. Default true. */
  enabled?: boolean;
  /**
   * Safe to ship to production: with a token set, plain ?perf does nothing
   * and only ?perf=<token> turns the probe on. It ships in your page's code,
   * so it keeps casual visitors out rather than securing anything; the probe
   * only measures the visitor's own scroll and sends nothing anywhere.
   */
  token?: string;
}

/** Whether this tab asked for the probe: ?perf turns it on (only ?perf=<token> when a token is set), ?perf=off off. */
export declare function wantsCadence(param?: string, token?: string): boolean;

/** Loads and starts the probe if this tab asked for it. Safe to call more than once. */
export declare function loadCadence(options?: CadenceOptions): Promise<boolean>;
