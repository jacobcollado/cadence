# Progress

Where Cadence stands, so work can pick up in a new session. Last updated 2026-10-25.

## What Cadence is

A tool for stress testing a site on real devices. A probe (`src/probe`) floats a panel over any page opened with `?perf`, runs a scripted pass, records every frame, and opens a report on the Cadence site (`src/app`). Positioning: a slow site makes a fast product look slow; Cadence shows which section stutters, and why. Open source (MIT), a product of Inertia.

## Where things live

- **Repo:** github.com/jacobcollado/cadence (private for now).
- **PR #1** (`cadence-v1`): the original build. Open, not merged.
- **PR #2** (`visual-polish`, based on `cadence-v1`): all the polish below. Open, not merged. Every change in this list is committed and pushed there.
- **npm:** `cadence-probe` 0.1.0 is published under the account `jacobcollado` (npmjs.com/package/cadence-probe). Publishing needs Windows Hello, so run `npm publish` from your own PowerShell, not from Claude Code.
- **Vercel:** project `cadence` in the Inertia team. Domains: `cad-ence.dev` (bought, attached, DNS still settling when last checked) and `cadence-seven-ivory.vercel.app`. Production last deployed from `cadence-v1`, so the live site does not show the PR #2 work yet.
- **Local dev:** `npm run dev` serves the app on http://localhost:5173. `npm run build` builds the probe and the app.
- **Rules:** `DESIGN.md` (design system, logo, writing rules), `README.md` (how runs are judged, releasing, launch checklist, what to watch).

## Done in PR #2

- **Report:** overview tiles as tabs (Smoothness, Page load, Memory) in a recessed tray, with the selected tile raised. Ratings Smooth, Uneven, Choppy. Graded page load on Core Web Vitals. Memory chart with hover. Device details in a popover. An "i" note beside every metric, with color-coded threshold bars. Labeled fields instead of dot separators.
- **Site-wide:** dark mode toggle. Stable page width. Footer: "A product of Inertia", then "Open source under MIT". Orbit mark with the lowercase "cadence" wordmark, sitting on the baseline. Top bar: logo (the way home), Docs, GitHub star button (shows a demo count of 1.3k in development only), theme toggle.
- **Home:** hero "Stress test your site on the devices your customers use.", a Get started button to the docs, and a live frame clock (one lap every 4 seconds, red dots for real dropped frames). Test cards for this device and for a phone (QR, hidden on phones). A folded "Add Cadence to your site" row with package manager tabs and a layout diff. Runs as a table.
- **Docs (`/docs`):** centered column; a sidebar with the logo, a highlighted section list, and the star and theme controls; it collapses to an icon rail. On phones, a section list under the title that pins to the top. Top fade while scrolling. A visual for every section: step timeline, pass meters, report tiles specimen, term cards, compare chart, tip icons, options table, and a privacy panel showing how a report link splits at the `#`.
- **npm package:** `packages/cadence-probe` (loader under 1 KB; the probe downloads only with `?perf`). Release with `npm run release:package -- patch|minor|major`, then publish manually. Only release when `src/probe/`, `src/shared/{run,stats,motion}.ts` or `packages/cadence-probe/` change.

## Next

- Keep polishing as Jacob directs (he was reviewing the docs page last).
- Before launch, work through "Going public" in `README.md`: make the repo public, merge the PRs, point the package's default report address at `https://cad-ence.dev` and release 0.1.1, empty the home page's default test page, remove the demo star count, finish the Inertia setup.
- Supabase for saved runs stays deferred until after launch.

## Working with Jacob

- Put a "Please read:" line at the top of any reply that needs him to read or decide something. Keep replies short.
- Everything goes on a branch and lands through a PR. Never commit to `main`. Don't merge unless asked.
- Check every UI change in screenshots (desktop, phone, light and dark) before calling it done.
- No em dashes, no uppercase labels, no separator glyphs between facts.
