# Cadence

Stress test your site on the devices your customers use.

A slow site makes a fast product look slow. Plenty of sites from serious companies stutter, especially on phones, and a technical visitor reads that lag as a sign of the product's quality. Cadence scrolls your pages on real phones, laptops and desktops, records every frame, and shows which section stutters and why, so you can fix it before a customer notices. It goes deeper than a load score: where frames dropped, what the browser was busy with, and how it compares across devices.

Cadence has two parts:

- **The probe** (`src/probe`): a small framework-free script, about 13 KB gzipped. A page loads it, and it floats a panel over the page that shows live frame rate, a frame graph and the section on screen. It runs scripted passes (steady scroll, fast scroll, idle, manual) with optional added main-thread load, and ties every dropped frame and slow task to the section that was on screen.
- **The app** (`src/app`): a Vite + React site that serves the probe and shows results. It has the report (a rating, sections, the frame timeline, why it slowed down, page load, memory, device and a glossary), the runs list and a comparison view.

## How runs are judged

The rules live in `src/shared/stats.ts`, so the overlay and the report always agree.

- **Frames** are on time, late (missed a refresh) or a freeze (50 ms or more).
- **Smooth** holds 92% of the refresh rate, with 95% of frames on time and no freezes. **Choppy** is under three quarters of 60 fps (45), or of the screen when it's slower. **Uneven** is in between.
- **Why it slowed down** splits each freeze by what the browser reported during it: a slow script, style and layout with no script, or nothing at all, which leaves drawing. Late frames under 50 ms can't be traced this way, and the report says so.

A finished run travels as a link: the run is deflated into the URL hash (`/r#…`), so nothing needs a server yet. Opening a report saves it to this browser's run list. Supabase replaces that later; the run format lives in `src/shared/run.ts`.

## Develop

```sh
npm install
npm run dev:probe   # rebuilds public/probe.js on change
npm run dev         # app on http://localhost:5173 (also on your LAN)
```

`http://localhost:5173/demo.html` is a test page with a calm section, a canvas, a deliberately heavy section and periodic long tasks.

## Using it on Inertia

Inertia loads the probe from `/cadence/probe.js` on its own origin, through a rewrite to wherever Cadence is deployed, so its CSP's `'self'` covers it. Set `CADENCE_ORIGIN` on the Inertia project (for local work, `CADENCE_ORIGIN=http://localhost:5173`). Then open any page with `?perf` on the end. The probe stays on for that tab until you close it from its panel, or open a page with `?perf=off`.

The probe names sections on its own (`main > section`, aria labels, class names). Mark an element with `data-cadence="Name"` to name it yourself.

## What each browser reports

Frame timing works everywhere. Chromium browsers also report slow tasks with the script behind them, layout shift, memory and interaction latency. Safari and Firefox show those as not reported rather than as zero.

## Scripts

- `scripts/probe-test.mjs`: drives the probe on the demo page in headless Chromium.
- `scripts/site-test.mjs <url> <out> <mode> <desktop|phone>`: injects the probe into a live site with analytics blocked. Set `THROTTLE=6` to slow the CPU.
- `scripts/flow-test.mjs [base]`: the real `?perf` loading flow against a local Inertia.
- `scripts/app-shots.mjs`, `scripts/compare-shots.mjs`: screenshots of the app.

## Releasing the npm package

### When to release

The package is the probe and the loader. Release a new version only when one of these changes:

- `src/probe/` (the panel, the runs, the measurements)
- `src/shared/run.ts`, `src/shared/stats.ts` or `src/shared/motion.ts` (the probe uses them)
- `packages/cadence-probe/` (the loader, the React component, the types, the package README)

Changes to the website alone (`src/app/`, the report, the home page, styles) never need a release: they go live when the site deploys. Each published version stays installed in people's projects until they update, so every release should be worth updating for.

### How to release

1. Bump and build: `npm run release:package -- patch` (fixes), `minor` (new features) or `major` (breaking changes).
2. Publish from your own PowerShell: `cd packages\cadence-probe`, then `npm publish`, and approve with Windows Hello.
3. Commit the version bump on a branch and open a PR.

## Going public

Things to switch on or check on launch day, so the first people who find Cadence get a working experience:

- [ ] Make the GitHub repo public. The star button's count then appears on its own, and the footer's MIT link starts working.
- [ ] Merge the open PRs into `main`, so production deploys from `main` again.
- [ ] Decide the site's address. If it moves off `cadence-seven-ivory.vercel.app`, update the package's default report address (`app` in `packages/cadence-probe/vite.config.ts`) and release a new version, or old installs keep opening reports at the old address.
- [ ] Replace the home page's default test page (`byinertia.com`) with an empty field and an example placeholder.
- [ ] Remove the demo star count once the real one shows (it only appears in development, but the code can go).
- [ ] Inertia: merge its `cadence-probe` branch, or swap it for the npm package, and set `CADENCE_ORIGIN` if it keeps the script tag.

## After launch: what to watch

Notes to keep the experience improving once real engineers use it:

- **npm downloads** (npmjs.com/package/cadence-probe) and **GitHub stars and issues**: the first signals of who's using it and what breaks.
- **Browsers and devices people report problems on**, especially Safari on iPhone, which reports less (no slow scripts, no memory).
- **Install friction:** any question about setup in an issue means the README or the setup row needs to say it better.
- **Report links that won't open:** very long runs make long links. If that comes up, it's the point to add saved runs (Supabase).
- **Probe size:** the probe is about 14 KB gzipped and only loads with `?perf`. Keep it there; check the size on every release.
