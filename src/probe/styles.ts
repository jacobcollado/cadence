import { MOTION_CSS } from "../shared/motion";

// Lives in a shadow root, so nothing here leaks into the page and nothing from
// the page leaks in.
export const STYLES = `
:host {
  all: initial;
  display: block;
  pointer-events: none;
  position: fixed;
  right: var(--x, 12px);
  bottom: calc(var(--y, 12px) + env(safe-area-inset-bottom, 0px));
  z-index: 2147483647;
  ${MOTION_CSS}
  --ink: #1a1a1a;
  --ink-2: #52514e;
  --ink-3: #8a8a85;
  --paper: #ffffff;
  --recess: #f2f2f0;
  --ring: rgba(0, 0, 0, 0.08);
  --ring-firm: rgba(0, 0, 0, 0.14);
  --data: #c6c6c0;
  --good: #0ca30c;
  --warn: #f5a623;
  --warn-ink: #d38900;
  --bad: #d03b3b;
}
* { box-sizing: border-box; margin: 0; padding: 0; }
.cd {
  font: 400 13px/1.4 -apple-system, BlinkMacSystemFont, "Segoe UI", system-ui, sans-serif;
  letter-spacing: -0.01em;
  color: var(--ink);
  -webkit-font-smoothing: antialiased;
  -webkit-tap-highlight-color: transparent;
  position: relative;
}
button { font: inherit; letter-spacing: inherit; color: inherit; background: none; border: 0; cursor: pointer; }
button:focus-visible { outline: 2px solid var(--ink); outline-offset: 2px; }
svg { display: block; flex: none; }
.num { font-variant-numeric: tabular-nums; }

/* Collapsed: a small tag with a live reading. */
.mini {
  position: absolute; right: 0; bottom: 0;
  height: 32px; padding: 0 12px;
  display: flex; align-items: center; gap: 8px;
  line-height: 1;
  background: var(--paper);
  border-radius: 6px;
  box-shadow: inset 0 0 0 1px var(--ring-firm), 0 8px 24px -6px rgba(0,0,0,.2), 0 1px 3px rgba(0,0,0,.08);
  font-size: 12px; font-weight: 500;
  white-space: nowrap;
  transform-origin: bottom right;
  transition: opacity var(--dur-base) var(--ease-out), transform var(--dur-slow) var(--ease-out);
}
.dot { width: 8px; height: 8px; border-radius: 50%; background: var(--good); transition: background-color var(--dur-base) var(--ease-out); }
.dot[data-rating="uneven"] { background: var(--warn); }
.dot[data-rating="choppy"] { background: var(--bad); }
.cd > * { pointer-events: auto; }
.cd:not([data-collapsed]) .mini { opacity: 0; transform: scale(0.6); pointer-events: none; }

/* Expanded panel. */
.panel {
  width: min(296px, calc(100vw - 24px));
  background: var(--paper);
  border-radius: 6px;
  box-shadow: inset 0 0 0 1px var(--ring-firm), 0 16px 40px -10px rgba(0,0,0,.24), 0 2px 6px rgba(0,0,0,.06);
  transform-origin: bottom right;
  transition: opacity var(--dur-base) var(--ease-out), transform var(--dur-slow) var(--ease-out), clip-path var(--dur-slow) var(--ease-out);
  clip-path: inset(0 0 0 0 round 6px);
}
.cd[data-collapsed] .panel {
  opacity: 0; transform: scale(0.92); pointer-events: none;
  clip-path: inset(calc(100% - 32px) 0 0 calc(100% - 88px) round 6px);
}

.head {
  display: flex; align-items: center; gap: 4px;
  height: 40px; padding: 0 6px 0 12px;
  cursor: grab; touch-action: none; user-select: none; -webkit-user-select: none;
}
.head:active { cursor: grabbing; }
.brand { display: flex; align-items: center; gap: 6px; font-weight: 600; flex: 1; line-height: 1; }
.brand-word { font-size: 14px; font-weight: 650; letter-spacing: -0.035em; }
.icon-btn {
  width: 28px; height: 28px; border-radius: 4px;
  display: flex; align-items: center; justify-content: center;
  color: var(--ink-2);
  transition: background-color var(--dur-fast) var(--ease-out), color var(--dur-fast) var(--ease-out);
}
.icon-btn:hover { background: var(--recess); color: var(--ink); }

.live { padding: 0 12px; }
.readout { display: flex; align-items: baseline; gap: 6px; height: 28px; }
.fps { font-size: 24px; font-weight: 600; letter-spacing: -0.03em; line-height: 1; }
.unit { color: var(--ink-3); font-size: 12px; }
.place {
  margin-left: auto; min-width: 0; max-width: 62%;
  display: flex; align-items: center; gap: 4px; align-self: center;
  color: var(--ink-3);
}
.where {
  min-width: 0; flex: 1;
  position: relative; display: block; height: 18px; line-height: 18px;
  color: var(--ink-2); font-size: 12px; text-align: right;
  clip-path: inset(0 -24px);
}
.where > span { display: block; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; width: 100%; }
.graph { display: block; width: 100%; height: 48px; margin-top: 8px; }

.body { overflow: hidden; }
.body-inner { padding: 12px; display: flex; flex-direction: column; gap: 12px; }
.enter > * { animation: rise var(--dur-slow) var(--ease-out) both; }
.enter > *:nth-child(2) { animation-delay: 30ms; }
.enter > *:nth-child(3) { animation-delay: 60ms; }
.enter > *:nth-child(4) { animation-delay: 90ms; }
.enter > *:nth-child(5) { animation-delay: 120ms; }
@keyframes rise { from { opacity: 0; transform: translateY(8px) scale(0.98); } }

/* Segmented control: a recessed track holding filled-black selection. */
.seg {
  display: flex; height: 32px; padding: 2px; gap: 2px;
  background: var(--recess); border-radius: 6px;
}
.seg button {
  flex: 1; height: 28px; border-radius: 4px;
  display: flex; align-items: center; justify-content: center; line-height: 1;
  font-size: 12px; font-weight: 500; color: var(--ink-2);
  transition: background-color var(--dur-fast) var(--ease-out), color var(--dur-fast) var(--ease-out);
}
.seg button:hover { color: var(--ink); }
.seg button[aria-pressed="true"] { background: var(--ink); color: #fff; }
.seg button:disabled { cursor: default; }

.hint { position: relative; color: var(--ink-3); font-size: 12px; line-height: 16px; clip-path: inset(0 -24px); }
.hint > span { display: block; width: 100%; }

.disclose {
  display: flex; align-items: center; gap: 6px; height: 24px; line-height: 1;
  color: var(--ink-2); font-size: 12px; align-self: flex-start;
}
.disclose svg { transition: transform var(--dur-base) var(--ease-out); }
.disclose[aria-expanded="true"] svg { transform: rotate(180deg); }
.fold { display: grid; grid-template-rows: 0fr; transition: grid-template-rows var(--dur-slow) var(--ease-out); margin-top: -12px; }
.fold[data-open] { grid-template-rows: 1fr; margin-top: 0; }
.fold > div { overflow: hidden; display: flex; flex-direction: column; gap: 8px; }

/* Buttons. The primary one has a lit face on a real shadow. */
.btn {
  height: 36px; padding: 0 14px; border-radius: 6px;
  display: flex; align-items: center; justify-content: center; gap: 6px;
  font-size: 13px; font-weight: 500; line-height: 1; white-space: nowrap;
  transition: transform var(--dur-fast) var(--ease-out), box-shadow var(--dur-fast) var(--ease-out), background-color var(--dur-fast) var(--ease-out);
}
.btn-primary {
  color: #fff;
  background: linear-gradient(180deg, #3b3b3b 0%, #1d1d1d 52%, #141414 100%);
  box-shadow: inset 0 1px 0 rgba(255,255,255,.2), inset 0 0 0 1px rgba(0,0,0,.6), 0 1px 2px rgba(0,0,0,.25), 0 4px 10px -3px rgba(0,0,0,.3);
}
.btn-primary:hover { transform: translateY(-1px); box-shadow: inset 0 1px 0 rgba(255,255,255,.22), inset 0 0 0 1px rgba(0,0,0,.6), 0 2px 3px rgba(0,0,0,.22), 0 8px 16px -4px rgba(0,0,0,.32); }
.btn-primary:active { transform: translateY(1px); box-shadow: inset 0 1px 2px rgba(0,0,0,.4), inset 0 0 0 1px rgba(0,0,0,.7), 0 0 1px rgba(0,0,0,.2); }
.btn-secondary { background: var(--paper); box-shadow: inset 0 0 0 1px var(--ring-firm); }
.btn-secondary:hover { background: var(--recess); }
.btn-secondary:active { transform: translateY(1px); }
.row { display: flex; gap: 8px; }
.row > .btn { flex: 1; }

/* Running. */
.status { display: flex; align-items: baseline; justify-content: space-between; font-size: 12px; color: var(--ink-2); }
.status .num { color: var(--ink); }
.status-text { position: relative; display: block; height: 16px; line-height: 16px; clip-path: inset(0 -24px); }
.status-text span { display: block; white-space: nowrap; }
.flip { position: relative; display: block; }
.track { height: 4px; border-radius: 2px; background: var(--recess); overflow: hidden; }
.fill { height: 100%; width: 100%; background: var(--ink); border-radius: 2px; transform-origin: left; transform: scaleX(0); }

/* Result. */
.result-head { display: flex; align-items: baseline; gap: 6px; }
.result-head .rating { margin-left: auto; align-self: center; }
.rating {
  height: 24px; padding: 0 8px 0 6px; border-radius: 4px;
  display: inline-flex; align-items: center; gap: 4px;
  background: var(--recess); font-size: 12px; font-weight: 500; line-height: 1; white-space: nowrap;
}
.rating svg { color: var(--good); }
.rating[data-rating="uneven"] svg { color: var(--warn-ink); }
.rating[data-rating="choppy"] svg { color: var(--bad); }
.big { font-size: 28px; font-weight: 600; letter-spacing: -0.03em; line-height: 1; }
.sentence { color: var(--ink-2); line-height: 18px; }
.bars { display: flex; flex-direction: column; gap: 6px; }
.bar-row { display: grid; grid-template-columns: 88px 1fr 24px 12px; align-items: center; gap: 8px; font-size: 12px; }
.bar-icon { color: var(--good); }
.bar-icon[data-rating="uneven"] { color: var(--warn-ink); }
.bar-icon[data-rating="choppy"] { color: var(--bad); }
.bar-label { white-space: nowrap; overflow: hidden; text-overflow: ellipsis; color: var(--ink-2); }
.bar-value { text-align: right; }
.bar { height: 8px; width: 0; border-radius: 0 4px 4px 0; background: var(--data); transition: width var(--dur-slow) var(--ease-out); }
.bar[data-rating="uneven"] { background: var(--warn); }
.bar[data-rating="choppy"] { background: var(--bad); }
.note { font-size: 12px; color: var(--ink-3); }

@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after { animation: none !important; transition: none !important; }
}
`;
