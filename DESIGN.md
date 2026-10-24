# Cadence design system

Builds on Jacob's global design rules. Where this file is more specific, it wins.

Cadence is read by developers and engineers who need to know what's wrong, quickly. Every graded thing leads with a verdict, then the number, then the detail.

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
- Thresholds are published standards wherever one exists (Core Web Vitals, Lighthouse page size). Cadence's own thresholds live in `src/shared/stats.ts` and are explained in the report's glossary.

## Components

- **Card** (`.card.block`): flat, inset ring, 20px padding, 16px apart. Every card opens with `.block-head`: an `h2`, a one-line `.meta` saying how to read it, and an optional legend or status on the right.
- **Card pair** (`.card-pair`): two cards side by side from 860px, sharing a top edge.
- **Metric row** (`.metric`): name and what it measures, the value on a threshold scale (`Scale`), the number, the status. Missing values say why, in place of the scale.
- **Table** (`.table`): 32px header, 44px rows, hairlines between, numbers right-aligned and tabular. Wide columns (`.wide`) hide under 600px.
- **Tag** (`.rating`): 24px (28px in the hero), recess fill, 4px radius (6px at 28).
- **Buttons**: 36px secondary for actions, the pressable primary only for the one main action on a view.
- **Disclosure**: only for reference material that isn't graded (the glossary).
- **Charts**: the frame timeline and memory spark are canvas or SVG, gray data, status color only for problems, hover tooltips as white raised cards.

## Writing

- A verdict first, then the number, then why.
- Plain words over jargon. A term that has to stay ("main thread", "Hz") is defined in the glossary.
- Say what wasn't measured and why, never show a zero for it.
- No em dashes, no uppercase labels.
