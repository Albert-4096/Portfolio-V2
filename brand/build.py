"""alberyt brand kit generator.

Everything is drawn on one 24-unit grid. The master mark is a peak (Λ: the A of Albert,
the Retezat ridge) followed by a block cursor (the terminal prompt). Every derived asset
reuses that grid, the leg weight, and the cursor block, so projects stay related without
looking identical.

Run:  python3 brand/build.py   ->  writes brand/dist/ and the site's favicons in assets/
"""
from pathlib import Path
import json, math

from fontTools.ttLib import TTFont
from fontTools.pens.svgPathPen import SVGPathPen
from fontTools.pens.transformPen import TransformPen
import cairosvg

HERE = Path(__file__).resolve().parent
REPO = HERE.parent
OUT = HERE / "dist"
SITE_ASSETS = REPO / "assets"
for sub in ("png", "icons", "tiles", "orar"):
    (OUT / sub).mkdir(parents=True, exist_ok=True)

FONT = str(REPO / "fonts" / "ibm-plex-mono-latin-500-normal.woff2")   # the site's own self-hosted Plex Mono

# ── Grid constants ────────────────────────────────────────────────────────────
BASE = 20.5      # baseline
TOP = 3.5        # apex
FOOT_L = 2.5     # outer left foot
FOOT_R = 15.5    # outer right foot
H = 3.6          # leg width measured along the baseline
CUR_X, CUR_W = 17.25, 4.5       # cursor block
CUR_H = None                    # set below to the legs' perpendicular weight, so the two read as one stroke


def f(n):
    s = f"{n:.3f}".rstrip("0").rstrip(".")
    return s if s != "-0" else "0"


def poly(pts):
    return "M" + "L".join(f"{f(x)} {f(y)}" for x, y in pts) + "Z"


def peak_path(cut=None):
    """The Λ. Inner edges are the outer ones shifted H along the baseline. With cut=(y, h),
    a horizontal band is removed below the summit, leaving a snowcap and the ridge."""
    apex_x = (FOOT_L + FOOT_R) / 2
    half = (FOOT_R - FOOT_L) / 2
    slope = (BASE - TOP) / half
    inner_apex_y = BASE - (half - H) * slope
    xl = lambda y: FOOT_L + (BASE - y) / slope
    xr = lambda y: FOOT_R - (BASE - y) / slope
    if not cut:
        return poly([(FOOT_L, BASE), (apex_x, TOP), (FOOT_R, BASE), (FOOT_R - H, BASE),
                     (apex_x, inner_apex_y), (FOOT_L + H, BASE)])
    y1, h = cut
    y2 = y1 + h
    assert y2 < inner_apex_y, "the cut must sit above the counter"
    summit = poly([(apex_x, TOP), (xr(y1), y1), (xl(y1), y1)])
    ridge = poly([(FOOT_L, BASE), (xl(y2), y2), (xr(y2), y2), (FOOT_R, BASE), (FOOT_R - H, BASE),
                  (apex_x, inner_apex_y), (FOOT_L + H, BASE)])
    return summit + ridge


def cursor_path(x=CUR_X, w=CUR_W, h=3.0, base=BASE):
    return f"M{f(x)} {f(base - h)}h{f(w)}v{f(h)}h{f(-w)}Z"


leg_angle = math.atan2(BASE - TOP, (FOOT_R - FOOT_L) / 2)
LEG_WEIGHT = H * math.sin(leg_angle)
CUR_H = round(LEG_WEIGHT * 4) / 4

# The contour: a horizontal cut through the peak just below the summit. It is the A's crossbar
# drawn in negative, and a contour line off the Retezat map. Dropped below 32px, where it clogs.
CUT_Y, CUT_H = 9.75, 1.0


PEAK_SIMPLE = peak_path()
PEAK = peak_path((CUT_Y, CUT_H))
CURSOR = cursor_path(w=CUR_W, h=CUR_H)


def svg(body, vb="0 0 24 24", w=None, h=None, extra=""):
    size = f' width="{w}" height="{h}"' if w else ""
    return f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="{vb}"{size}{extra}>{body}</svg>\n'


def write(path, text):
    p = OUT / path
    p.parent.mkdir(parents=True, exist_ok=True)
    p.write_text(text)
    return p


def png(src, dst, size, h=None):
    cairosvg.svg2png(url=str(src), write_to=str(dst), output_width=size, output_height=h or size)


# ── Wordmark from IBM Plex Mono 500 outlines ──────────────────────────────────
def text_path(text, font=FONT, size=1000):
    tt = TTFont(font)
    gs, cmap = tt.getGlyphSet(), tt.getBestCmap()
    upm = tt["head"].unitsPerEm
    sc = size / upm
    pen = SVGPathPen(gs)
    x = 0
    for ch in text:
        g = gs[cmap[ord(ch)]]
        g.draw(TransformPen(pen, (sc, 0, 0, -sc, x, 0)))
        x += g.width * sc
    return pen.getCommands(), x, tt["OS/2"].sxHeight * sc, tt["OS/2"].sCapHeight * sc


# ── Colourways: one per design system in Portfolio-V2, plus orar ──────────────
# field = ground, ink = the peak, signal = the cursor. Taken from each system's tokens.css.
SYSTEMS = {
    "retezat": {"dark": ("#0a0d0b", "#d9dfda", "#4cd97b"), "light": ("#f2f5f1", "#0c120e", "#157a3c"), "radius": 0},
    "atelier": {"dark": ("#16120e", "#f3ebde", "#f3ebde"), "light": ("#fbf7f0", "#211c16", "#211c16"), "radius": 5.5},
    "dosar":   {"dark": ("#0f1218", "#eef0f4", "#a3abff"), "light": ("#f5f6f7", "#141821", "#2f3aa3"), "radius": 1.5},
    "signal":  {"dark": ("#0b0d10", "#e8eaee", "#7090ff"), "light": ("#f6f7f9", "#0e1117", "#2f5cff"), "radius": 2.5},
    "marquee": {"dark": ("#131312", "#f3f2ef", "#f3f2ef"), "light": ("#f3f2ef", "#141414", "#141414"), "radius": 0},
    "orar":    {"dark": ("#0e1a2b", "#f3efe2", "#f5c518"), "light": ("#f5cc14", "#121212", "#a81812"), "radius": 0.75},
}


def mark_group(ink, signal, peak=PEAK, cursor=CURSOR):
    return f'<path d="{peak}" fill="{ink}"/><path d="{cursor}" fill="{signal}"/>'


def tile(field, ink, signal, radius, scale=0.8, small=False):
    """App-icon tile: the mark centred optically inside a field."""
    cx, cy = (FOOT_L + CUR_X + CUR_W) / 2, (TOP + BASE) / 2 + 0.4   # nudge down: a peak's mass sits low
    g = (f'<g transform="translate(12 12) scale({scale}) translate({f(-cx)} {f(-cy)})">'
         f'{mark_group(ink, signal, peak=PEAK_SIMPLE if small else PEAK)}</g>')
    return f'<rect width="24" height="24" rx="{radius}" fill="{field}"/>{g}'


def build_mark():
    files = {}
    # 1. The adaptive mark: currentColor peak, --signal cursor. Drop it into any page.
    files["alberyt-mark.svg"] = svg(
        '<path d="%s" fill="currentColor"/><path d="%s" fill="var(--mark-signal, currentColor)"/>' % (PEAK, CURSOR))
    # 2. Mono mark for single-colour contexts (stamps, laser, print)
    files["alberyt-mark-mono.svg"] = svg(f'<path d="{PEAK}{CURSOR}" fill="#000"/>')
    # 3. Animated variant: blinking cursor, respects reduced motion
    files["alberyt-mark-animated.svg"] = svg(
        '<style>.c{animation:b 1.06s steps(1) infinite}@keyframes b{50%{opacity:0}}'
        '@media (prefers-reduced-motion:reduce){.c{animation:none}}</style>'
        f'<path d="{PEAK}" fill="#d9dfda"/><path class="c" d="{CURSOR}" fill="#4cd97b"/>')
    for name, body in files.items():
        write(name, body)

    files["alberyt-mark-small.svg"] = svg(
        '<path d="%s" fill="currentColor"/><path d="%s" fill="var(--mark-signal, currentColor)"/>' % (PEAK_SIMPLE, CURSOR))
    write("alberyt-mark-small.svg", files["alberyt-mark-small.svg"])

    # Wordmark and lockup share one scale: the peak is as tall as Plex Mono's capitals, and the
    # wordmark ends on the very same cursor block the mark ends on.
    d, adv, xh, cap = text_path("alberyt")
    from fontTools.pens.boundsPen import BoundsPen
    tt = TTFont(FONT)
    gs, cmap = tt.getGlyphSet(), tt.getBestCmap()
    lsb = tt["hmtx"][cmap[ord("a")]][1]
    t_bounds = BoundsPen(gs)
    gs[cmap[ord("t")]].draw(t_bounds)
    t_right = adv - 600 + t_bounds.bounds[2]          # ink edge of the final t
    s = cap / (BASE - TOP)                             # grid unit -> font units
    cw, chh = 480, CUR_H * s                          # one monospace cell wide: a terminal cursor
    gap = (CUR_X - FOOT_R) * s                         # the same air the mark leaves before its cursor
    asc, desc = 1025, 275
    word = (f'<path transform="translate({f(-lsb)} {asc})" d="{d}" fill="currentColor"/>'
            f'<rect x="{f(t_right - lsb + gap)}" y="{f(asc - chh)}" width="{f(cw)}" height="{f(chh)}" fill="var(--mark-signal, currentColor)"/>')
    write("alberyt-wordmark.svg", svg(word, vb=f"0 0 {f(t_right - lsb + gap + cw)} {asc + desc}"))

    m_w = (CUR_X + CUR_W - FOOT_L) * s
    space = 0.5 * m_w
    lock = (f'<g transform="translate(0 {f(asc - BASE * s)}) scale({f(s)}) translate({-FOOT_L} 0)">'
            f'<path d="{PEAK}" fill="currentColor"/><path d="{CURSOR}" fill="var(--mark-signal, currentColor)"/></g>'
            f'<path transform="translate({f(m_w + space - lsb)} {asc})" d="{d}" fill="currentColor"/>')
    write("alberyt-lockup.svg", svg(lock, vb=f"0 0 {f(m_w + space + t_right - lsb)} {asc + desc}"))

    # Tiles per system and theme
    for sysname, s in SYSTEMS.items():
        for theme in ("dark", "light"):
            fld, ink, sig = s[theme]
            p = write(f"tiles/{sysname}-{theme}.svg", svg(tile(fld, ink, sig, s["radius"])))
            write(f"tiles/{sysname}-{theme}-favicon.svg", svg(tile(fld, ink, sig, max(s["radius"], 0), scale=0.86, small=True)))
            png(p, OUT / "png" / f"tile-{sysname}-{theme}-128.png", 128)
    return d, adv


# ── Derived UI icon set (24 grid, 2u stroke, square caps, mitred joins) ──────
STROKE = 2
ICONS = {
    # name: (stroked path, filled path or "")
    "ArrowCounterClockwise": None,  # built below
    "ArrowRight": ("M4 12h14M13 6l6 6-6 6", ""),
    "ArrowsLeftRight": ("M4 8h14M15 4l4 4-4 4M20 16H6M9 12l-4 4 4 4", ""),
    "CalendarPlus": ("M4 6h16v15H4zM8 3v3M16 3v3M12 13v5M9.5 15.5h5", "M4 6h16v4H4z"),
    "CaretRight": ("M9 5l7 7-7 7", ""),
    "Check": ("M4 12.5l5 5L20 6.5", ""),
    "Copy": ("M9 9h11v11H9zM15 9V4H4v11h5", ""),
    "DownloadSimple": ("M12 3v11M7 9.5l5 5 5-5M4 15v5h16v-5", ""),
    "FilePdf": ("M6 13V3h9l4 4v6M14 3v5h5M6 19v2h13v-2", "M3 13.5h18v5H3z"),
    "Link": ("M9.5 7H7a5 5 0 0 0 0 10h2.5M14.5 7H17a5 5 0 0 1 0 10h-2.5M8.5 12h7", ""),
    "ListChecks": ("M12 6h9M12 12h9M12 18h9M3 6l2 2 3.5-3.5M3 12l2 2 3.5-3.5M3 18l2 2 3.5-3.5", ""),
    "PencilSimple": ("M4 20v-4L15.5 4.5l4 4L8 20zM12.5 7.5l4 4", ""),
    "Plus": ("M12 4v16M4 12h16", ""),
    "Prohibit": ("M12 3.5a8.5 8.5 0 1 0 0 17a8.5 8.5 0 1 0 0-17zM6 6l12 12", ""),
    "ShareNetwork": ("M8 11l8-4.5M8 13l8 4.5", "M3.5 9.5h5v5h-5zM15.5 3h5v5h-5zM15.5 16h5v5h-5z"),
    "Trash": ("M3.5 6h17M9 6V3h6v3M6 6l1 15h10l1-15M10 10v7M14 10v7", ""),
    "X": ("M5.5 5.5l13 13M18.5 5.5l-13 13", ""),
}


def arc_ccw():
    # an open loop that runs clockwise from the arrow at upper left, so the arrow points back (undo)
    cx, cy, r = 12.5, 12.5, 7.5
    a0, a1 = math.radians(200), math.radians(200 + 300)
    x0, y0 = cx + r * math.cos(a0), cy + r * math.sin(a0)
    x1, y1 = cx + r * math.cos(a1), cy + r * math.sin(a1)
    arc = f"M{f(x0)} {f(y0)}A{r} {r} 0 1 1 {f(x1)} {f(y1)}"
    head = f"M{f(x0 - 0.3)} {f(y0 - 6)}V{f(y0)}h6"
    return arc + head


ICONS["ArrowCounterClockwise"] = (arc_ccw(), "")


def icon_svg(name, color="currentColor"):
    st, fl = ICONS[name]
    body = (f'<path d="{st}" fill="none" stroke="{color}" stroke-width="{STROKE}" '
            f'stroke-linecap="square" stroke-linejoin="miter"/>')
    if fl:
        body += f'<path d="{fl}" fill="{color}"/>'
    return svg(body)


def build_icons():
    for n in ICONS:
        p = write(f"icons/{n}.svg", icon_svg(n))
    # sprite for plain-HTML projects
    syms = []
    for n, (st, fl) in ICONS.items():
        inner = (f'<path d="{st}" fill="none" stroke="currentColor" stroke-width="{STROKE}" '
                 f'stroke-linecap="square" stroke-linejoin="miter"/>' + (f'<path d="{fl}" fill="currentColor"/>' if fl else ""))
        syms.append(f'<symbol id="i-{kebab(n)}" viewBox="0 0 24 24">{inner}</symbol>')
    write("icons/sprite.svg", '<svg xmlns="http://www.w3.org/2000/svg" style="display:none">' + "".join(syms) + "</svg>\n")
    (OUT / "icons.json").write_text(json.dumps(ICONS, indent=1))


def kebab(n):
    out = ""
    for i, c in enumerate(n):
        if c.isupper() and i:
            out += "-"
        out += c.lower()
    return out


# ── orar: the endorsed app icon ───────────────────────────────────────────────
# orar keeps its own glyph (the yellow "Plecări" poster) and carries the alberyt cursor as the
# poster's last cell: the signature sits where every project tile puts it, on the baseline at
# the right edge of the safe area.
ORAR = dict(ink="#121212", paper="#f5cc14", signal="#a81812", board="#0e1a2b", board_ink="#f3efe2", amber="#f5c518")


def orar_glyph(paper, ink, signal):
    """The poster, on a 16-unit pixel grid so it lands on whole pixels at 16 and 32 px.
    Sheet 2..14, a time column and a destination column, three departures. The top-right cell is
    an alternating-week cell (inked on the diagonal); the bottom-right cell holds the alberyt
    cursor, in orar's signal colour."""
    return (f'<rect x="2" y="2" width="12" height="12" fill="{paper}"/>'
            f'<path d="M2 5h12v1H2zM2 9h12v1H2zM7 2h1v12H7z" fill="{ink}"/>'   # rules
            f'<path d="M8 2h6L8 5z" fill="{ink}"/>'                             # odd/even cell
            f'<rect x="9" y="11" width="4" height="2" fill="{signal}"/>')      # signature cursor


def build_orar():
    o = ORAR
    vb = "0 0 16 16"
    # favicon: black sign frame + poster (same silhouette as today, so returning users still find the tab)
    fav = f'<rect width="16" height="16" rx="1.5" fill="{o["ink"]}"/>' + orar_glyph(o["paper"], o["ink"], o["signal"])
    write("orar/favicon.svg", svg(fav, vb=vb))
    # maskable: full bleed, the poster scaled into the 80% safe zone
    mask = (f'<rect width="16" height="16" fill="{o["ink"]}"/>'
            f'<g transform="translate(8 8) scale(0.78) translate(-8 -8)">{orar_glyph(o["paper"], o["ink"], o["signal"])}</g>')
    write("orar/icon-maskable.svg", svg(mask, vb=vb))
    # dark: the departures board (navy panel, warm-white rules, amber cursor)
    dark = f'<rect width="16" height="16" rx="1.5" fill="#050b14"/>' + orar_glyph("#15243a", o["board_ink"], o["amber"])
    write("orar/favicon-dark.svg", svg(dark, vb=vb))
    both = ('<style>.d{display:none}@media (prefers-color-scheme:dark){.l{display:none}.d{display:inline}}</style>'
            f'<g class="l">{fav}</g><g class="d">{dark}</g>')
    write("orar/favicon-auto.svg", svg(both, vb=vb))
    png(OUT / "orar/favicon.svg", OUT / "orar/icon-192.png", 192)
    png(OUT / "orar/favicon.svg", OUT / "orar/icon-512.png", 512)
    png(OUT / "orar/icon-maskable.svg", OUT / "orar/icon-maskable-512.png", 512)
    png(OUT / "orar/icon-maskable.svg", OUT / "orar/apple-touch-icon.png", 180)
    for s in (16, 32, 64):
        png(OUT / "orar/favicon.svg", OUT / "png" / f"orar-favicon-{s}.png", s)
        png(OUT / "orar/favicon-dark.svg", OUT / "png" / f"orar-favicon-dark-{s}.png", s)


def build_site():
    """alberyt.xyz's own favicons, in the Retezat colourway. Written straight into assets/ so the
    site can never drift from the kit."""
    fld, ink, sig = SYSTEMS["retezat"]["dark"]
    fav = SITE_ASSETS / "favicon.svg"
    fav.write_text(svg(tile(fld, ink, sig, 0, scale=0.86, small=True)))
    touch = OUT / "site-apple-touch-icon.svg"     # iOS rounds the corners itself: full bleed, big mark
    touch.write_text(svg(tile(fld, ink, sig, 0, scale=0.8)))
    png(touch, SITE_ASSETS / "apple-touch-icon.png", 180)
    png(fav, OUT / "png" / "site-favicon-32.png", 32)


if __name__ == "__main__":
    build_mark()
    build_icons()
    build_orar()
    build_site()
    print("leg weight:", round(LEG_WEIGHT, 3), "cursor height:", CUR_H)
    print("wrote", sum(1 for _ in OUT.rglob("*")), "files to", OUT)
