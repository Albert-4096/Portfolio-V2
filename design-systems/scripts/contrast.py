#!/usr/bin/env python3
"""Check WCAG contrast for every system's colour tokens, in every theme.

Usage:  python3 design-systems/scripts/contrast.py [system ...]

Reads <system>/tokens.css, builds each theme (the bare :root block, then
each [data-theme] block layered on top), resolves var() aliases, composites
rgba() over the background it sits on, and checks the pairs the components
actually use. Exits 1 if any required pair fails.
"""
import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
SYSTEMS = ["retezat", "atelier", "dosar", "signal", "marquee"]

# (foreground, background, minimum ratio, why)
PAIRS = [
    ("text", "bg", 4.5, "body text"),
    ("text-2", "bg", 4.5, "secondary text"),
    ("muted", "bg", 4.5, "meta and labels"),
    ("text", "surface", 4.5, "text on cards"),
    ("text-2", "surface", 4.5, "secondary text on cards"),
    ("muted", "surface", 4.5, "labels on cards"),
    ("muted", "surface-2", 4.5, "labels on wells"),
    ("accent", "bg", 4.5, "links"),
    ("accent", "surface", 4.5, "links on cards"),
    ("accent-ink", "accent", 4.5, "primary button label"),
    ("success", "surface", 4.5, "success text"),
    ("warning", "surface", 4.5, "warning text"),
    ("danger", "surface", 4.5, "error text"),
    ("danger", "bg", 4.5, "error text on page"),
    ("selection-ink", "selection", 4.5, "selected text"),
    ("control", "bg", 3.0, "input and checkbox borders"),
    ("control", "input-bg", 3.0, "input borders on their fill"),
    ("focus", "bg", 3.0, "focus ring"),
    ("field-ink", "field", 4.5, "text on the colour field"),
    ("sage", "bg", 3.0, "sage marks"),
    ("accent", "surface-2", 4.5, "links in wells"),
]

DECL = re.compile(r"--([\w-]+)\s*:\s*([^;]+);")


def blocks(css):
    """Yield (selector, body) for top-level and @media-nested rule blocks."""
    css = re.sub(r"/\*.*?\*/", "", css, flags=re.S)
    css = re.sub(r"@import\s+url\([^)]*\)[^;]*;", "", css)
    i = 0
    while True:
        m = re.search(r"([^{}]+)\{", css[i:])
        if not m:
            return
        sel = m.group(1).strip()
        start = i + m.end()
        if sel.startswith("@media"):
            depth, j = 1, start
            while depth:
                depth += {"{": 1, "}": -1}.get(css[j], 0)
                j += 1
            inner = css[start:j - 1]
            for s, b in blocks(inner):
                yield f"{sel} {s}", b
            i = j
        else:
            end = css.index("}", start)
            yield sel, css[start:end]
            i = end + 1


def themes(css):
    base, extra, dark_first = {}, {}, False
    for sel, body in blocks(css):
        decls = dict(DECL.findall(body))
        if sel == ":root":
            base.update(decls)
            dark_first |= bool(re.search(r"color-scheme:\s*dark", body))
        elif 'data-theme="dark"]' in sel and "@media" not in sel:
            extra["dark"] = decls
        elif 'data-theme="light"]' in sel and "@media" not in sel:
            extra["light"] = decls
    first = "dark" if dark_first else "light"
    out = {first: dict(base)}
    for name, decls in extra.items():
        out[name] = {**base, **decls}
    return out


def parse(value, theme, seen=()):
    value = value.strip()
    m = re.fullmatch(r"var\(--([\w-]+)\)", value)
    if m:
        name = m.group(1)
        if name in seen or name not in theme:
            return None
        return parse(theme[name], theme, seen + (name,))
    if value.startswith("#"):
        h = value[1:]
        if len(h) == 3:
            h = "".join(c * 2 for c in h)
        return tuple(int(h[k:k + 2], 16) for k in (0, 2, 4)) + (1.0,)
    m = re.fullmatch(r"rgba?\(([^)]+)\)", value)
    if m:
        parts = [p.strip() for p in re.split(r"[,\s/]+", m.group(1)) if p.strip()]
        r, g, b = (float(p) for p in parts[:3])
        a = float(parts[3]) if len(parts) > 3 else 1.0
        return (r, g, b, a)
    return None


def over(fg, bg):
    a = fg[3]
    return tuple(fg[k] * a + bg[k] * (1 - a) for k in range(3)) + (1.0,)


def lum(c):
    def ch(v):
        v /= 255
        return v / 12.92 if v <= 0.03928 else ((v + 0.055) / 1.055) ** 2.4
    r, g, b = (ch(v) for v in c[:3])
    return 0.2126 * r + 0.7152 * g + 0.0722 * b


def ratio(a, b):
    la, lb = sorted((lum(a), lum(b)), reverse=True)
    return (la + 0.05) / (lb + 0.05)


def check(system):
    css = (ROOT / system / "tokens.css").read_text()
    failures = 0
    for theme_name, theme in themes(css).items():
        page = parse(theme["bg"], theme)
        print(f"\n{system} · {theme_name}")
        for fg_name, bg_name, need, why in PAIRS:
            if fg_name not in theme or bg_name not in theme:
                continue
            fg, bg = parse(theme[fg_name], theme), parse(theme[bg_name], theme)
            if fg is None or bg is None:
                print(f"  ?    {fg_name} on {bg_name}: unparsed value")
                continue
            bg = over(bg, page)
            fg = over(fg, bg)
            r = ratio(fg, bg)
            ok = r >= need
            failures += not ok
            mark = " ok " if ok else "FAIL"
            print(f"  {mark} {r:5.2f}  {fg_name:>13} on {bg_name:<10} (≥{need}, {why})")
    # colour-field presets, e.g. [data-field="lime"] { --field: …; --field-ink: … }
    for sel, body in blocks(css):
        m = re.fullmatch(r'\[data-field="([\w-]+)"\]', sel)
        decls = dict(DECL.findall(body))
        if not m or "field" not in decls or "field-ink" not in decls:
            continue
        r = ratio(parse(decls["field-ink"], decls), parse(decls["field"], decls))
        ok = r >= 4.5
        failures += not ok
        print(f"  {' ok ' if ok else 'FAIL'} {r:5.2f}  preset {m.group(1)}: field-ink on field (≥4.5)")
    return failures


def main():
    names = sys.argv[1:] or SYSTEMS
    failures = sum(check(n) for n in names)
    print(f"\n{failures} failing pair(s)")
    sys.exit(1 if failures else 0)


if __name__ == "__main__":
    main()
