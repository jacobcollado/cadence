export interface CadenceOptions {
  /** The query switch that turns the probe on. Default "perf", as in ?perf. */
  param?: string;
  /** Where reports open. Default: the hosted Cadence app. */
  app?: string;
  /** Set false to never load, for example outside staging. Default true. */
  enabled?: boolean;
}

/** Whether this tab asked for the probe: ?perf turns it on, ?perf=off off. */
export declare function wantsCadence(param?: string): boolean;

/** Loads and starts the probe if this tab asked for it. Safe to call more than once. */
export declare function loadCadence(options?: CadenceOptions): Promise<boolean>;
