# Cadence design system

Cadence is read by developers and engineers who need to know what's wrong, quickly. Every graded thing leads with a verdict, then the number, then the detail.

## Hero orbit

The hero's visual is the mark drawn huge in the home page's flat art (`HeroOrbit.tsx`, SVG): the ring lies back as a wide ellipse spanning the page under the copy, kept inside the page's frame and tilted enough to read as a ring, never flattened into bands across the screen. It is a thick gray tube (`--art-2`) with an outline (`--art-line`), over a faint flat shadow of itself (half a step off the paper, thinner than the tube, so it reads as floor and not a second ring), gap and dot included. The dot is the page's one violet moment (`--art-pop`), riding in the ring's gap at the mark's proportions. It turns at a steady beat and all but stops once a lap, like a missed frame, growing as it comes round the front.

- Everything is sized from its box, so it fills the space under the copy at any width.
- It fades out toward the section's sides and floor, so it blends into the hero instead of sitting in it as a picture with edges.
- It stops moving off screen and rests at the front right, as in the mark, under reduced motion.

## Logo

- The mark is an orbit: a ring with a dot riding on it, in a gap. The wordmark is lowercase "cadence" in Satoshi, a touch heavier and tighter than body text.
- The mark sits on the wordmark's baseline the way a round letter does: its box ends at the ring's outer edge (viewBox 0 0 16 14) and the logo aligns by baseline. Never nudge it with offsets.
- In display or marketing type (headlines, video, social), the name only appears as the lockup: the mark with lowercase "cadence". Never a capitalized "Cadence" set as a headline word. Where a line needs the product as its subject, rewrite it so the lockup can answer it instead. `<Cadence />` in code and plain running text in docs are the exceptions.
- On hover the dot travels once around the orbit; skipped under reduced motion.

## Tokens

All live in `src/app/styles.css` (`:root`) and are mirrored in `src/probe/styles.ts` for the overlay.

| Role | Token | Value |
|---|---|---|
| Text | `--ink`, `--ink-2`, `--ink-3` | `#1a1a1a`, `#52514e`, `#6e6d68` (all pass AA on paper and recess) |
| Surfaces | `--paper`, `--recess`, `--hover` | `#fff`, `#f4f4f2`, `#f7f7f5` |
| Outlines | `--ring`, `--ring-firm` | 8% and 14% black, always inset |
| Hairlines | `--grid` | `#ecebe6` |
| Data | `--data`, `--data-dim`, `--data-line` | `#c6c6c0`, `#e6e6e1`, `#a8a7a0` |
| Status | `--good`, `--warn`, `--warn-ink`, `--bad` | `#0ca30c`, `#f5a623`, `#d38900`, `#d03b3b` |
| Motion | `--dur-*`, `--ease-*` | from `src/shared/motion.ts` |

Type is Satoshi, set tight: body text at -0.0375em, headings from -0.0375em (17) to -0.0525em (40), tighter as they grow. Sizes in use: 28 title, 24 subtitle, 17 card heading and hero sentence, 15 and 14 body and buttons, 13 meta, 12 labels, tags and axis ticks. Nothing goes under 12. Fields are 16 on phones so iOS doesn't zoom in. Don't add new sizes.

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

- On the home page, two rails on the shell's edges run the full height of the page, so the top bar, every section and the footer sit between them. A hairline separates each. Content keeps the shell's content edge. Phones drop the side rails and keep the hairlines.
- Double rails: on wide screens each rail is two hairlines 4px apart, and the hairlines between sections run to the inner line. No marks at the joints, and the rails carry nothing else: no ticks, live data or scroll traces.
- Home sections alternate: most put the heading and one short line centered above the content; a few (copy beside a chart or a pair of cards) split into a left heading column and content, vertically centered beside it. On desktop the pictures carry the scale: How it works panels are 5:4, the device rows and comparison bars stand 120px or taller. Never all one layout. Sections get real room: 96px above and below on desktop, 56px on phones. One heading, one line, one visual per section; no paragraphs.
- From 1024px the home page widens to 1200px and steps its type up: 40 hero title, 30 section headings, 17 ledes and card titles, 15 body, meta, nav and footer, 13 chart labels and tags. These sizes are for the home page on desktop only.
- The hero is centered: the line, lede and actions at the top, the orbit beneath them. On desktop (from 1024px) it fills the first screen under the top bar and banner, capped at 960px tall, and the orbit takes all the room the copy leaves. The type stays at 40 (weight 500); the visual carries the scale. Section headings on the home page match the hero at weight 500; headings in the app stay at 600.
- A heading is always the widest line of text in its stack. The lede under it is narrower, in even lines (`text-wrap: balance` on both, the hero lede capped at 30em, 21em on phones), so the stack narrows from heading to lede to actions.
- Every other page uses the same `.shell` (960px, 16 or 32px gutters). The scrollbar takes room only when the page scrolls; no gutter is reserved, so full-width bars reach the window edge.

## Components

- **Score ring** (`ScoreRing`): a score out of 100 as a ring, like Lighthouse: the arc fills to the score in its band's status color (90+ good, 50 to 89 needs work, under 50 poor) with the number inside, and both count up. 56px for the report's overall score beside the device name, 28px on each overview tile (where it replaces the status icon) and in the runs list. A score always sits in the band its word says.
- **Docs in the frame**: the docs use the same top bar, rails and footer as every other page. On wide screens the section list has its own 224px lane, divided from the text by a double hairline (the rails' motif), and each section is a cell whose hairline runs from that line to the rail. Prose keeps a 720px measure; pictures, card grids, code and tables take the cell's full width, so there is no empty lane beside the text. From 1200px card grids fill whole rows (four passes in one row, six tips in two rows of three). Color lives only in the docs' pictures, never in headings, the section list or icon tiles; the current section in the list is just ink text at medium weight, with no background or bar. The pictures use the home page's flat art: each pass card opens on a scene (a tall sheet of gray blocks scrolling past an ink frame with ringed corners, at the pass's speed; Idle holds still with one pulsing violet dot; Manual drags under a pointer); dropped frames as empty outlined slots and a freeze as one red bar past a dashed budget line, in recessed panels with the bars running off the sides; cause tags as light art pills with the art outline, stacked; the three term pictures are 152px tall. The privacy link is an ink pill for the address, a ringed # where it splits, and a locked light pill for the run running off the edge, with outlined brackets naming each half. The tiles specimen mirrors the report: its selected tile is a plain raised card.
- **Report in the rails**: the report sits in the same rails as the home page, at the same 1200px width on desktop, with three sections: the header, the overview, and the open tab.
- **Report colors**: the report uses the standard colors, no glass and no category tints. Data is gray: on-time frames and good bars in `--data`. Status colors carry the verdicts: late in amber, freezes and poor in red. The selected tile is a plain raised card; in dark mode it takes the page background (`--paper`) with a firmer ring. Interface is black.
- **Report layout**: the header (device, page, actions), then the overview, then the selected category. The overview has one tile per graded category (Smoothness, Page load, Memory), each with its status, headline number and a short verdict, so the whole report reads at a glance. Tiles are tabs, held in a recessed tray: the selected one lifts out as a raised card (never a solid black or white fill, which reads too loud at this size), and its cards open below. The tab lives in the URL (`?tab=load`), so a copied link opens the same view. The header shows only the device and the page; the run and device details are context, not a result, so they open in a Details popover. No summary sentence sits between the tiles and the tab; the tiles carry the verdict. Each tab opens with a row of four stat cards (the numbers worth seeing first), then its cards in a grid: on Smoothness the frame chart runs full width, with Sections and Why it slowed down side by side beneath it. The page keeps the same width as every other page.
- **Card** (`.card.block`): flat, inset ring, 20px padding, 16px apart. Every card opens with `.block-head`: an `h2` with its `Info`, and an optional legend or status on the right.
- **Card pair** (`.card-pair`): two cards side by side from 860px, sharing a top edge.
- **Metric row** (`.metric`): the name with its `Info`, the value on a threshold scale (`Scale`), the number, the status. Missing values say why, in place of the scale.
- **Table** (`.table`): 32px header, 44px rows, hairlines between, numbers right-aligned and tabular. Wide columns (`.wide`) hide under 600px.
- **Tag** (`.rating`): 24px (28px in the hero), recess fill, 4px radius (6px at 28).
- **Buttons**: 36px secondary for actions, the pressable primary only for the one main action on a view.
- **Info** (`Info`): an "i" beside a title or column header that opens a raised card: what it is, why it matters, the thresholds, and where this run landed. Use it instead of subtitles. What stays visible: verdicts, numbers, thresholds and the sentences that explain a slowdown.
- **Disclosure**: only for reference material that isn't graded.
- **Footer**: under a hairline, on the page's content edges: the logo with who makes it and the license, then link groups (Product, Follow) with a 13px heading in ink and links in ink-2.
- **Device marks**: where a chart names devices, each name carries its platform's mark (Apple, Android) in ink, beside the name and always visible. A device with no single platform, like a laptop, gets a plain solid drawing at the same weight. This overrides "logos on hover only" for device names.
- **Art** (`.art`, `--art-*`, home page below the hero): the home page's pictures are flat illustrations, not glass. Three gray tones (`--art-1` to `--art-3`) and an outline (`--art-line`), with oversized shapes that run off their panel's edges, thick strokes, ringed handles and dashed trails. Solid ink marks interface (a code pill, a selection frame). Color appears at most once per picture, as the brand violet (`--art-pop`). A frame drawn is a gray bar. In the device rows (Fast on your laptop) a missed frame is a red bar (`--bad`), so the phone's chop reads at a glance; elsewhere a missed frame is an empty outlined slot (`data-miss`). No device mockups. The hero's ring is drawn in the same art. Nothing on the site uses glass any more.
- **Empty states** (home page): a dashed outline in `--ring-firm` marks a place waiting for something (no runs yet, no QR code yet), never a gray filled box. An empty runs list shows a wide row of empty frame slots (the lightest art tone with its outline) at uneven heights, running off both sides with a fade, above its line.
- **Charts**: the frame timeline and memory spark are canvas or SVG, gray data, status color only for problems, hover tooltips as white raised cards.

## Writing

- A verdict first, then the number, then why.
- Plain words over jargon. A term that has to stay ("main thread", "Hz") is defined in its `Info` note.
- Say what wasn't measured and why, never show a zero for it.
- No em dashes, no uppercase labels.
- No separator glyphs (dots, pipes, slashes, decorative marks) between facts. Facts that sit together get structure instead: labeled fields (`Fields`, a small muted label over each value) in headers, and a column header row in lists. A device name from the probe ("iPhone · Safari 26.0") is split with `splitName` into device and browser; in a sentence it reads as plain words.

## Copy buttons

A copy button keeps its width when it confirms. Each state is its icon and label as one group, stacked in place and centered, so "✓ Copied" sits centered rather than left in leftover space. The new state rises 4px with a light blur clearing while the old one leaves upward, over the base duration. Reduced motion keeps the crossfade and drops the movement. Nothing beside the button moves.

## Step visuals

How it works shows each step's picture in its own recessed panel, with the title and line sitting below it, unboxed. Don't wrap a step's picture and words in one card. Each picture shows the mechanism, not just the idea: the probe drops into the layout file, sections light up only inside the ?perf window, and the report's frames stand against a dashed 16.7 ms budget line, with the ones over it in gray.

## Device rows

Each device row in the frames comparison is headed by a line: the device's mark in a 28px recessed tile (32px on desktop), its name, and its frame rate right-aligned in ink with the unit in gray. The panes run the full width below it. Don't stack a loose icon and a small gray fps beside the panes.

## Recessed panels and dark mode

A recessed panel (step visuals, icon tiles) is the recess fill alone, with no outline: the fill already sets it apart, and an outline on top makes it read as a card. Dark mode's page is near-black (#0b0b0a), never pure #000: pure black smears on OLED phones when scrolling and makes light text glow. The recess, raised, grid and data steps sit just above it so every level stays visible.

## The ?perf window

The window in How it works is a selection frame: an ink outline with ringed corners over the scrolling page, the page's blocks a tone darker inside it. No dashed or marching outline.

## Run a test

Run a test is two numbered steps in a centered column (920px at most): install, then open a page. Each number sits on a ringed handle, joined to the next by a dashed trail. The two ways to open a page (this device, a phone) share one panel, not two cards; the phone's half is a recessed panel with the QR code held in an ink selection frame with ringed corners. Under the field, the exact address that will open is shown in mono with the added ?perf in a flat light tag (muted until a page is entered).

## Why not Lighthouse or DevTools

One scroll read three ways, in aligned rows: the tool's name and a short verdict in a left column (above the panel on phones), and what it shows of the scroll in a recessed panel, so the same frames line up down all three. Lighthouse shows a good score beside "Load only" over a dashed "Scroll not measured" panel. DevTools shows the frame times as light gray bars with no names. Cadence shows them as flat gray bars with late frames in red, each section named under its frames, and the section that stuttered held in an ink selection frame with ringed corners and a black cause tag just above it. A tag never covers a frame's corner handles. No feature tables or comparison cards.

## Report readability

- Zone scales in tooltips have a key under the bar (swatch, name, range per line), never names squeezed into each zone.
- The frame chart keeps at least 140px per second of run. When that's wider than the card it scrolls sideways under fixed frame time labels, with fades on the sides that have more. Hovering a section row scrolls its frames into view.
- Stat tiles open the same card as their metric's info button, on hover (mouse) or tap.
- Metric rows on phones: name, value and status on one line, the scale full width below. Wider: one line with the scale in the middle.
