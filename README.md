# Cadence

Stress test your site on the devices your customers use.

Lighthouse grades the load. Cadence times the scroll. It scrolls a page on a real phone, laptop or desktop, records every frame, and shows which section stuttered, what the browser was busy with, and what to change first.

[cad-ence.dev](https://cad-ence.dev) · [Docs](https://cad-ence.dev/docs) · [A page that's slow on purpose](https://cad-ence.dev/demo.html)

## Quick start

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

Anywhere else, call `loadCadence()` from `cadence-probe` once when the page starts.

Then open any page with `?perf` on the end. A panel appears: pick a pass, run it, and open the report.

## Test on a real phone

Open [cad-ence.dev](https://cad-ence.dev), enter your page, and scan the QR code with your phone. The page opens there with Cadence on. No app, no cable, no remote debugging.

It works anywhere a phone can reach the page: a preview deploy, staging or production.

## Safe to ship

- **Off for your visitors.** The probe only loads when the address ends in `?perf`, and stays on for that tab until you close the panel or visit with `?perf=off`.
- **Lock it in production.** Set a token, `<Cadence token="x7k2-team" />`, and plain `?perf` does nothing; only `?perf=x7k2-team` turns it on.
- **Nothing leaves the browser.** There's no server and no tracking. A report is a link, with the run compressed into the part after the `#`, which browsers never send.

## What a report tells you

- **Smoothness**, for the whole page and each section, named from the page's headings and landmarks. To name one yourself, add `data-cadence="Pricing"` to it.
- **Why it slowed down**: each freeze traced to a script, to layout, or to drawing. Chromium browsers name the exact script.
- **A score out of 100**, like Lighthouse, for smoothness, page load and memory.

Cadence runs in any modern browser. Safari and Firefox show what they can't measure as not reported, never as zero. How every rating is decided is in the [docs](https://cad-ence.dev/docs).

## Develop

```sh
npm install
npm run dev:probe   # rebuilds public/probe.js on change
npm run dev         # the site on http://localhost:5173
```

- `src/probe`: the panel and the measurements. No framework, about 17 KB gzipped.
- `src/app`: the site and the report (Vite and React).
- `src/shared`: the run format, the rules and the advice, used by both.

`/demo.html` is a landing page for a product that doesn't exist, slow on purpose: each section makes one common mistake, so it shows up in a report even on a fast machine.

Want to help? Read [CONTRIBUTING.md](CONTRIBUTING.md) first.

## License

MIT
