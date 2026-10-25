# Cadence design system

Builds on Jacob's global design rules. Where this file is more specific, it wins.

Cadence is read by developers and engineers who need to know what's wrong, quickly. Every graded thing leads with a verdict, then the number, then the detail.

## Logo

- The mark is an orbit: a ring with a dot riding on it, in a gap. The wordmark is lowercase "cadence" in Satoshi, a touch heavier and tighter than body text.
- The mark sits on the wordmark's baseline the way a round letter does: its box ends at the ring's outer edge (viewBox 0 0 16 14) and the logo aligns by baseline. Never nudge it with offsets.
- On hover the dot travels once around the orbit; skipped under reduced motion.

## Tokens

All live in `src/app/styles.css` (`:root`) and are mirrored in `src/probe/styles.ts` for the overlay.

| Role | Token | Value |
|---|---|---|
| Text | `--ink`, `--ink-2`, `--ink-3` | `#1a1a1a`, `#52514e`, `#8a8a85` |
| Surfaces | `--paper`, `--recess`, `--hover` | `#fff`, `#f4f4f2`, `#f7f7f5` |
| Outlines | `--ring`, `--ring-firm` | 8% and 14% black, always inset |
| Hairlines | `--grid` | `#ecebe6` |
| Data | `--data`, `--data-dim`, `--data-line` | `#c6c6c0`, `#e6e6e1`, `#a8a7a0` |
| Status | `--good`, `--warn`, `--warn-ink`, `--bad` | `#0ca30c`, `#f5a623`, `#d38900`, `#d03b3b` |
| Motion | `--dur-*`, `--ease-*` | from `src/shared/motion.ts` |

Type is Satoshi. Sizes in use: 28 title, 24 subtitle, 17 card heading and hero sentence, 15 and 14 body, 13 meta, 12 labels and tags, 11 axis ticks. Don't add new ones.

## Themes

Light and dark, picked with the toggle in the top bar, remembered per browser, and following the system until someone picks. `index.html` sets `data-theme` before first paint. Dark mode is its own set of steps, not an inversion: status hues stay the same, while dims, data grays and the solid fill are re-stepped. Solid fills (`--solid`, `--solid-face`) are black in light mode and near-white in dark. Canvas charts read the tokens when they draw. QR codes stay dark on white in both.

## Status

One scale for everything graded, defined in `src/shared/vitals.ts`:

| Level | Word | Icon | Frame rating |
|---|---|---|---|
| `good` | Good | circle with a check | Smooth |
| `warn` | Needs work | triangle with a mark | Uneven |
| `bad` | Poor | circle with a mark | Choppy |

- A status is always shape, color and word together (`StatusTag`). An icon alone (`StatusIcon`) only goes where the row already names what's graded, like a legend count or the overlay's section rows.
- Status colors mark problems. Bars for good results stay gray `--data`; only needs-work and poor bars take amber and red, so problems are what stands out.
- Frame tiers follow the same order: on time gray, late amber, freeze (50 ms or more) red.
- Thresholds are published standards wherever one exists (Core Web Vitals, Lighthouse page size). Cadence's own thresholds live in `src/shared/stats.ts` and are explained in the notes beside each rating.

## Layout

- Every page uses the same `.shell` (960px, 16 or 32px gutters), and the scrollbar's room is always reserved (`scrollbar-gutter: stable`), so moving between a short page and a long one never shifts the layout.

## Components

- **Report layout**: the header (device, page, actions), then the overview, then the selected category. The overview has one tile per graded category (Smoothness, Page load, Memory), each with its status, headline number and a short verdict, so the whole report reads at a glance. Tiles are tabs, held in a recessed tray: the selected one lifts out as a raised card (never a solid black or white fill, which reads too loud at this size), and its cards open below. The tab lives in the URL (`?tab=load`), so a copied link opens the same view. The header shows only the device and the page; the run and device details are context, not a result, so they open in a Details popover. No summary sentence sits between the tiles and the tab; the tiles carry the verdict. Each tab opens with a row of four stat cards (the numbers worth seeing first), then its cards in a grid: on Smoothness the frame chart runs full width, with Sections and Why it slowed down side by side beneath it. The page keeps the same width as every other page.
- **Card** (`.card.block`): flat, inset ring, 20px padding, 16px apart. Every card opens with `.block-head`: an `h2` with its `Info`, and an optional legend or status on the right.
- **Card pair** (`.card-pair`): two cards side by side from 860px, sharing a top edge.
- **Metric row** (`.metric`): the name with its `Info`, the value on a threshold scale (`Scale`), the number, the status. Missing values say why, in place of the scale.
- **Table** (`.table`): 32px header, 44px rows, hairlines between, numbers right-aligned and tabular. Wide columns (`.wide`) hide under 600px.
- **Tag** (`.rating`): 24px (28px in the hero), recess fill, 4px radius (6px at 28).
- **Buttons**: 36px secondary for actions, the pressable primary only for the one main action on a view.
- **Info** (`Info`): an "i" beside a title or column header that opens a raised card: what it is, why it matters, the thresholds, and where this run landed. Use it instead of subtitles. What stays visible: verdicts, numbers, thresholds and the sentences that explain a slowdown.
- **Disclosure**: only for reference material that isn't graded.
- **Charts**: the frame timeline and memory spark are canvas or SVG, gray data, status color only for problems, hover tooltips as white raised cards.

## Writing

- A verdict first, then the number, then why.
- Plain words over jargon. A term that has to stay ("main thread", "Hz") is defined in its `Info` note.
- Say what wasn't measured and why, never show a zero for it.
- No em dashes, no uppercase labels.
- No separator glyphs (dots, pipes, slashes, decorative marks) between facts. Facts that sit together get structure instead: labeled fields (`Fields`, a small muted label over each value) in headers, and a column header row in lists. A device name from the probe ("iPhone · Safari 26.0") is split with `splitName` into device and browser; in a sentence it reads as plain words.
