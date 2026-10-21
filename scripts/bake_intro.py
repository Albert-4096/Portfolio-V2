#!/usr/bin/env python3
"""Bake assets/retezat-intro.bin, the line drawing js/intro.js flies through on a first visit.

Reads assets/retezat-heightmap.png the way js/terrain.js's vertex shader does (a 513x513 vertex grid,
bilinear, flipY), so every line lands exactly where the WebGL scene and the posters draw it.

Contents (little-endian):
  'RTZ1'  u16 grid (512)  f32 contour interval
  contours   u8 levels, then per level: u8 k, varint lines, per line: varint n, x0, y0, then n-1 zigzag
             deltas. Coordinates are vertex-grid cells * 8 (col = x, row = z; row 0 is the far edge).
  summits    u8 count, per summit: u8 aspect (0 landscape, 1 portrait), u8 top level, u16 row, col of the
             A's centre, u16 r0, c0, rows, cols of a height patch, then rows*cols heights * 4095 as
             zigzag varint residuals (see predict).
             js/intro.js contours the A's field blended into this patch at runtime, so the A can melt.

Needs numpy and Pillow only.  Run:  python3 scripts/bake_intro.py
"""
from collections import defaultdict
from pathlib import Path
import json, struct

import numpy as np
from PIL import Image

REPO = Path(__file__).resolve().parent.parent
GRID = 512                 # PlaneGeometry segments in js/terrain.js
SCALE = 8                  # fixed point: 1/8 cell
CONTOUR_M = 100            # js/terrain.js contourRealM
# Where the A sits, in vertex-grid (row, col): a 2,250 m summit that lands at ~82% across, ~57% down
# in the final desktop frame, clear of the hero text. Phones cut to the poster from top-down, so one is enough.
SUMMITS = [(0, (379, 364))]
A_UNIT = 2.7               # grid cells per mark unit (js/intro.js A_UNIT)
A_CENTRE = (9.0, 12.0)     # the A's centre in the mark's 24-unit grid
PATCH_MARGIN = 12          # mark units around the A's box that the blend can reach (js/intro.js RING_REACH)


def vertex_heights(png):
    """Heights at the (GRID+1)^2 vertices, sampled like the shader: bilinear, uv = (ix/n, 1-iy/n), flipY."""
    im = np.array(Image.open(png)).astype(np.float64)
    h = (im[..., 0] * 256 + im[..., 1]) / 65535.0
    rows_n, cols_n = h.shape
    i = np.arange(GRID + 1) / GRID

    def taps(coord, size):
        c0 = np.floor(coord).astype(int)
        return np.clip(c0, 0, size - 1), np.clip(c0 + 1, 0, size - 1), coord - c0

    r0, r1, tr = taps(i * rows_n - 0.5, rows_n)
    c0, c1, tc = taps(i * cols_n - 0.5, cols_n)
    tc, tr = tc[None, :], tr[:, None]
    top = h[np.ix_(r0, c0)] * (1 - tc) + h[np.ix_(r0, c1)] * tc
    bot = h[np.ix_(r1, c0)] * (1 - tc) + h[np.ix_(r1, c1)] * tc
    return top * (1 - tr) + bot * tr


def contour(f, level):
    """Polylines of f == level as (n, 2) arrays of (col, row), joined across cells."""
    b = f > level
    code = b[:-1, :-1] * 8 + b[:-1, 1:] * 4 + b[1:, 1:] * 2 + b[1:, :-1] * 1
    rr, cc = np.nonzero((code != 0) & (code != 15))
    tl, tr, br, bl = f[rr, cc], f[rr, cc + 1], f[rr + 1, cc + 1], f[rr + 1, cc]

    def at(a, b_):
        d = b_ - a
        return (level - a) / np.where(d == 0, 1, d)

    pts = [np.stack([cc + at(tl, tr), rr + 0.0], 1), np.stack([cc + 1.0, rr + at(tr, br)], 1),
           np.stack([cc + at(bl, br), rr + 1.0], 1), np.stack([cc + 0.0, rr + at(tl, bl)], 1)]
    keys = [lambda r, c: (0, r, c), lambda r, c: (1, r, c + 1), lambda r, c: (0, r + 1, c), lambda r, c: (1, r, c)]
    table = {1: [(3, 2)], 2: [(2, 1)], 3: [(3, 1)], 4: [(0, 1)], 6: [(0, 2)], 7: [(3, 0)],
             8: [(3, 0)], 9: [(0, 2)], 11: [(0, 1)], 12: [(3, 1)], 13: [(2, 1)], 14: [(3, 2)]}
    centre = (tl + tr + br + bl) / 4
    segs = []
    for n, cd in enumerate(code[rr, cc]):
        r, c = int(rr[n]), int(cc[n])
        pairs = table.get(int(cd))
        if pairs is None:  # saddle, settled by the cell centre
            up = centre[n] > level
            pairs = ([(3, 0), (2, 1)] if up else [(3, 2), (0, 1)]) if cd == 5 else ([(0, 1), (3, 2)] if up else [(3, 0), (2, 1)])
        for e1, e2 in pairs:
            segs.append((keys[e1](r, c), pts[e1][n], keys[e2](r, c), pts[e2][n]))
    ends = defaultdict(list)
    for i, (k1, _, k2, _) in enumerate(segs):
        ends[k1].append(i); ends[k2].append(i)
    used = np.zeros(len(segs), bool)
    lines = []
    for s, (k1, p1, k2, p2) in enumerate(segs):
        if used[s]:
            continue
        used[s] = True
        line, chain = [p1, p2], [k1, k2]
        for _ in range(2):
            while True:
                nxt = [j for j in ends[chain[-1]] if not used[j]]
                if not nxt:
                    break
                used[nxt[0]] = True
                a1, q1, a2, q2 = segs[nxt[0]]
                line.append(q2 if a1 == chain[-1] else q1)
                chain.append(a2 if a1 == chain[-1] else a1)
            line.reverse(); chain.reverse()
        lines.append(np.array(line))
    return lines


def simplify(pts, tol):
    """Douglas-Peucker with a per-point tolerance."""
    n = len(pts)
    if n < 3:
        return pts
    keep = np.zeros(n, bool); keep[[0, -1]] = True
    stack = [(0, n - 1)]
    while stack:
        a, b = stack.pop()
        if b <= a + 1:
            continue
        p, seg = pts[a], pts[b] - pts[a]
        mid = pts[a + 1:b]
        L = np.hypot(*seg)
        d = np.hypot(*(mid - p).T) if L == 0 else np.abs(seg[0] * (mid[:, 1] - p[1]) - seg[1] * (mid[:, 0] - p[0])) / L
        i = int(np.argmax(d - tol[a + 1:b]))
        if d[i] > tol[a + 1 + i]:
            keep[a + 1 + i] = True
            stack += [(a, a + 1 + i), (a + 1 + i, b)]
    return pts[keep]


def predict(g):
    """Residuals against left + up - up-left: near zero on smooth terrain, so they pack smaller."""
    p = np.zeros_like(g)
    p[1:, 1:] = g[1:, :-1] + g[:-1, 1:] - g[:-1, :-1]
    p[0, 1:] = g[0, :-1]
    p[1:, 0] = g[:-1, 0]
    return g - p


def varint(out, v):
    while True:
        byte = v & 0x7F
        v >>= 7
        out.append(byte | (0x80 if v else 0))
        if not v:
            return


def main():
    meta = json.loads((REPO / 'assets/retezat-meta.json').read_text())
    H = vertex_heights(REPO / 'assets/retezat-heightmap.png')
    ci = CONTOUR_M / meta['verticalRangeM']

    def tolerance(line):
        # tight near the summits (seen up close at the start), looser where it's only ever seen from afar
        d = np.min([np.hypot(line[:, 1] - r, line[:, 0] - c) for _, (r, c) in SUMMITS], axis=0)
        return np.clip(0.1 + (d - 30) * 0.0035, 0.1, 0.5)

    out = bytearray(b'RTZ1') + struct.pack('<Hf', GRID, ci)
    levels = list(range(1, int(1 / ci) + 1))
    out.append(len(levels))
    npts = 0
    for k in levels:
        lines = [simplify(l, tolerance(l)) for l in contour(H, k * ci)]
        # specks under ~1.5 px from the landing camera
        lines = [l for l in lines if len(l) >= 2 and np.hypot(*np.diff(l, axis=0).T).sum() > 4]
        out.append(k); varint(out, len(lines))
        for l in lines:
            q = np.rint(l * SCALE).astype(np.int64)
            varint(out, len(q)); varint(out, int(q[0, 0])); varint(out, int(q[0, 1]))
            for dx, dy in np.diff(q, axis=0):
                varint(out, int(dx * 2) ^ int(dx >> 63)); varint(out, int(dy * 2) ^ int(dy >> 63))
            npts += len(q)

    out.append(len(SUMMITS))
    for aspect, (r, c) in SUMMITS:
        top = int(H[r - 3:r + 4, c - 3:c + 4].max() / ci) + 6
        # the A's box (2.5..15.5 x 3.5..20.5 in mark units) plus the blend's reach, in cells
        x0 = c + (2.5 - A_CENTRE[0] - PATCH_MARGIN) * A_UNIT
        x1 = c + (15.5 - A_CENTRE[0] + PATCH_MARGIN) * A_UNIT
        y0 = r + (3.5 - A_CENTRE[1] - PATCH_MARGIN) * A_UNIT
        y1 = r + (20.5 - A_CENTRE[1] + PATCH_MARGIN) * A_UNIT
        r0, c0 = int(np.floor(y0)) - 1, int(np.floor(x0)) - 1
        rows, cols = int(np.ceil(y1)) + 2 - r0, int(np.ceil(x1)) + 2 - c0
        patch = predict(np.rint(H[r0:r0 + rows, c0:c0 + cols] * 4095).astype(np.int64))
        out += struct.pack('<BBHHHHHH', aspect, top, r, c, r0, c0, rows, cols)
        for v in patch.ravel():
            varint(out, int(v * 2) ^ int(v >> 63))

    dst = REPO / 'assets/retezat-intro.bin'
    dst.write_bytes(bytes(out))
    print(f'{dst.relative_to(REPO)}: {len(out):,} B, {npts:,} contour points, interval {ci:.5f}')


if __name__ == '__main__':
    main()
