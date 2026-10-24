# Builds the Cadence wordmark from its centerlines: each stroke becomes a filled
# outline that swells on downstrokes and thins on upstrokes, like a pointed pen,
# then the whole word is slanted. Writes src/app/wordmark.ts.
# Usage: python scripts/wordmark.py
import math, os, re

# Centerlines, upright. Baseline y 190, x-height 112, ascender 38.
C = "M150 72 C154 52 140 40 118 42 C80 46 50 90 48 132 C46 172 74 196 110 190 C134 186 152 174 166 160"
ADEN = " ".join([
    "C178 148 188 146 192 140 C197 126 210 110 230 110 C238 110 243 114 245 121 C234 108 206 110 196 132 C192 140 189 150 189 160 C189 176 198 189 212 188 C230 186 242 162 248 116",
    "C244 148 240 178 252 188 C262 196 274 184 284 172",
    "C292 150 312 120 340 120 C322 112 302 118 296 142 C290 166 300 190 320 186 C336 182 348 150 354 104",
    "C362 70 374 44 368 37 C360 32 346 66 343 104 C340 150 340 184 354 189 C366 193 378 182 390 168",
    "C402 154 420 140 420 126 C420 112 400 112 392 128 C384 146 388 186 412 188 C428 189 438 178 446 166",
    "C452 150 456 130 458 114 C458 142 456 168 454 190 C460 158 474 118 496 116 C512 115 512 142 508 166 C506 184 512 192 524 187 C532 183 540 174 545 160",
    "C547 140 556 116 576 112 C586 111 593 118 590 130 C593 118 586 111 576 112 C556 116 547 140 545 160 C545 176 560 190 578 186 C592 184 600 174 608 162",
    "C620 148 638 136 638 122 C638 108 618 108 610 126 C602 146 606 186 630 188 C650 189 668 172 682 150",
])

TIGHTEN = 0.82      # lowercase drawn this much narrower, toward the C
ORIGIN_X = 178      # where the lowercase starts
SLANT = math.tan(math.radians(16))
THIN, THICK = 5.4, 13
C_WEIGHT = 1.15     # the capital carries a little more weight
STEPS = 18          # samples per cubic


def parse(d):
    nums = [float(n) for n in re.findall(r"-?\d+(?:\.\d+)?", d)]
    cmds = re.findall(r"[MC]", d)
    segs, i, cur = [], 0, None
    for c in cmds:
        if c == "M":
            cur = (nums[i], nums[i + 1]); i += 2
        else:
            p = [cur] + [(nums[i + k], nums[i + k + 1]) for k in (0, 2, 4)]
            i += 6
            segs.append(p)
            cur = p[3]
    return segs


def tighten(segs):
    f = lambda x: x if x <= ORIGIN_X else ORIGIN_X + (x - ORIGIN_X) * TIGHTEN
    return [[(f(x), y) for x, y in s] for s in segs]


def cubic(p, t):
    u = 1 - t
    x = u**3 * p[0][0] + 3 * u * u * t * p[1][0] + 3 * u * t * t * p[2][0] + t**3 * p[3][0]
    y = u**3 * p[0][1] + 3 * u * u * t * p[1][1] + 3 * u * t * t * p[2][1] + t**3 * p[3][1]
    return x, y


def sample(segs, weights):
    pts, ws = [], []
    for s, w in zip(segs, weights):
        for k in range(STEPS + (1 if s is segs[-1] else 0)):
            pts.append(cubic(s, k / STEPS))
            ws.append(w)
    return pts, ws


def outline(pts, weights):
    """Left and right edges of one stroke, with widths that follow the pen."""
    n = len(pts)
    # Ease the weight between strokes of different weight.
    for _ in range(40):
        weights = [weights[0]] + [(weights[i - 1] + weights[i] * 2 + weights[i + 1]) / 4 for i in range(1, n - 1)] + [weights[-1]]
    tangents, widths = [], []
    for i in range(n):
        a, b = pts[max(0, i - 1)], pts[min(n - 1, i + 1)]
        dx, dy = b[0] - a[0], b[1] - a[1]
        l = math.hypot(dx, dy) or 1
        tangents.append((dx / l, dy / l))
        down = max(0.0, dy / l)              # screen y grows downward
        widths.append((THIN + (THICK - THIN) * down ** 1.6) * weights[i])
    # Smooth the width so the swell rises and falls gently.
    for _ in range(8):
        widths = [widths[0]] + [(widths[i - 1] + 2 * widths[i] + widths[i + 1]) / 4 for i in range(1, n - 1)] + [widths[-1]]
    left, right = [], []
    for (x, y), (tx, ty), w in zip(pts, tangents, widths):
        nx, ny = -ty, tx
        left.append((x + nx * w / 2, y + ny * w / 2))
        right.append((x - nx * w / 2, y - ny * w / 2))
    return left, right, tangents, widths


def cap(center, t, w, start):
    cx, cy = center
    ang = math.atan2(t[1], t[0]) + math.pi / 2
    k0 = 0 if start else 1
    return [(cx + math.cos(ang + math.pi * (k / 10) * (1 if start else -1) + (0 if start else 0)) * w / 2,
             cy + math.sin(ang + math.pi * (k / 10) * (1 if start else -1)) * w / 2) for k in range(11)]


def circle(center, w):
    cx, cy = center
    return [(cx + math.cos(2 * math.pi * k / 16) * w / 2, cy + math.sin(2 * math.pi * k / 16) * w / 2) for k in range(16)]


def slant(poly):
    return [(x - (y - 190) * SLANT, y) for x, y in poly]


def to_d(poly):
    return "M" + " L".join(f"{x:.1f} {y:.1f}" for x, y in poly) + " Z"


def area(poly):
    return sum(poly[i][0] * poly[(i + 1) % len(poly)][1] - poly[(i + 1) % len(poly)][0] * poly[i][1] for i in range(len(poly))) / 2


def wound(poly):
    """Every piece wound the same way, so overlaps add up instead of cancelling."""
    return poly if area(poly) > 0 else poly[::-1]


def runs(segs):
    """Split a stroke where it turns sharply (a cusp), so the outline never folds."""
    out, cur = [], [segs[0]]
    for prev, s in zip(segs, segs[1:]):
        a = (prev[3][0] - prev[2][0], prev[3][1] - prev[2][1])
        b = (s[1][0] - s[0][0], s[1][1] - s[0][1])
        la, lb = math.hypot(*a) or 1, math.hypot(*b) or 1
        cos = (a[0] * b[0] + a[1] * b[1]) / (la * lb)
        if cos < 0.3:
            out.append(cur)
            cur = []
        cur.append(s)
    out.append(cur)
    return out


def pieces(d, heavy=0, chunk=10):
    """One stroke as short overlapping pieces, so loops that cross fill solid.
    The first `heavy` cubics carry the capital's weight."""
    out = []
    segs = tighten(parse(d))
    weight = {id(sg): (C_WEIGHT if i < heavy else 1.0) for i, sg in enumerate(segs)}
    for run in runs(segs):
        pts, ws = sample(run, [weight[id(sg)] for sg in run])
        left, right, _, widths = outline(pts, ws)
        n = len(pts)
        for i in range(0, n - 1, chunk):
            j = min(n - 1, i + chunk + 2)
            out.append(left[i:j + 1] + right[i:j + 1][::-1])
        # Round ends and round joins at the cusps.
        out.append(circle(pts[0], widths[0]))
        out.append(circle(pts[-1], widths[-1]))
    return [wound(slant(p)) for p in out]


# The C and the lowercase are one stroke; the C's four cubics are heavier.
def shape(polys, square=False):
    xs = [x for p in polys for x, _ in p]
    ys = [y for p in polys for _, y in p]
    pad = 2
    x0, y0, w, h = min(xs) - pad, min(ys) - pad, max(xs) - min(xs) + 2 * pad, max(ys) - min(ys) + 2 * pad
    if square:
        side = max(w, h)
        x0, y0, w, h = x0 - (side - w) / 2, y0 - (side - h) / 2, side, side
    return f"{x0:.0f} {y0:.0f} {w:.0f} {h:.0f}", " ".join(to_d(p) for p in polys)


# The word: the C and the lowercase are one stroke; the C's four cubics are heavier.
word_box, word = shape(pieces(C + " " + ADEN, heavy=4))
# The monogram: the C alone, for the browser tab and the probe panel. It's
# drawn heavier, since it's seen at 16px.
THIN, THICK = THIN * 1.8, THICK * 1.6
mono_box, mono = shape(pieces(C, heavy=4), square=True)

root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
with open(os.path.join(root, "src", "shared", "wordmark.ts"), "w", encoding="utf8") as f:
    f.write("// The Cadence wordmark and its C, generated by scripts/wordmark.py from their centerlines. Don't edit by hand.\n")
    f.write(f'export const WORDMARK = {{ viewBox: "{word_box}", d: "{word}" }};\n')
    f.write(f'export const MONOGRAM = {{ viewBox: "{mono_box}", d: "{mono}" }};\n')
# The tab icon follows the browser's theme.
with open(os.path.join(root, "public", "favicon.svg"), "w", encoding="utf8") as f:
    f.write(f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="{mono_box}"><style>path{{fill:#1a1a1a}}@media (prefers-color-scheme:dark){{path{{fill:#ecebe7}}}}</style><path d="{mono}"/></svg>\n')
print("word", word_box, len(word), "mono", mono_box, len(mono))
