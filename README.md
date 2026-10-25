# Cadence

Stress test your site on the devices your customers use.

Cadence scrolls a page on a real phone, laptop or desktop and records every frame. The report shows which section stuttered, what the browser was busy with when it did, and what to change first.

Try it at [cad-ence.dev](https://cad-ence.dev).

## Add it to your site

```sh
npm install cadence-probe
```

In React or Next.js, add `<Cadence />` to your root layout:

```tsx
import { Cadence } from "cadence-probe/react";

<body>
  {children}
  <Cadence />
</body>
```

Anywhere else, call `loadCadence()` from `cadence-probe`.

Then open any page with `?perf` on the end. A panel appears; pick a pass, run it, and open the report. Visitors never download the probe. It only loads with `?perf`, and stays on for that tab until you close the panel or visit with `?perf=off`.

Sections are named from the page's markup. To name one yourself, add `data-cadence="Pricing"` to it.

## How runs are judged

The rules live in `src/shared/stats.ts`, so the panel and the report always agree.

- A frame is on time, late (it missed a refresh) or a freeze (50 ms or more).
- **Smooth** holds 92% of the refresh rate with 95% of frames on time and no freezes. **Choppy** is under 45 fps, or under three quarters of the screen's rate when it's slower than 60. **Uneven** is everything in between.
- A whole run is Smooth only when every section on screen long enough to judge is Smooth too.
- Every report has a score out of 100, like Lighthouse, and each category has its own: 90 and up is good, 50 to 89 needs work, under 50 is poor. Each measurement is scored on Lighthouse's log-normal curve, pinned so Cadence's good threshold scores 90 and its poor threshold 50. The overall score weighs smoothness 50, page load 30 and memory 20, counting only what was measured. The rules live in `src/shared/score.ts`.
- Each freeze is traced to a slow script, to style and layout, or to drawing, based on what the browser reported during it. Browsers only report frames with 50 ms of work or more, so a freeze within one refresh of that line with no report stays untraced rather than being put down to drawing. The report says when most dropped frames couldn't be traced.

Frame timing and page elements work in every browser. Chromium also reports slow scripts, layout shift and input delay. Safari and Firefox show those as not reported, never as zero.

Chrome only gives pages a rounded heap figure that it rarely refreshes. Cadence shows the heap only when it moved during the run, and watches page elements for leaks everywhere.

A report is a link. The run is compressed into the part after the `#`, which browsers don't send to the server.

## Develop

```sh
npm install
npm run dev:probe   # rebuilds public/probe.js on change
npm run dev         # the app on http://localhost:5173
```

`/demo.html` is a landing page for a product that doesn't exist, slow on purpose. Each section makes one common mistake (a glowing canvas, a scroll handler that forces layout, a blocking tracker, script-driven layout animation, a resizing form), so it shows up in a report even on a fast machine.

- `src/probe`: the panel and the measurements. No framework, about 17 KB gzipped.
- `src/app`: the site and the report (Vite and React).
- `src/shared`: the run format, the rules and the advice, used by both.
- `packages/cadence-probe`: the npm package, a small loader around the probe.

## Releasing the package

Release only when the probe changes, which means anything in `src/probe/`, `src/shared/` or `packages/cadence-probe/`. Site changes go live on deploy.

```sh
npm run release:package -- patch   # or minor, major
cd packages/cadence-probe
npm publish
```

## License

MIT
