#!/usr/bin/env python3
"""Bake web assets from a 1 m airborne-LiDAR DTM (ESRI ASCII / .asc).

Runs inside the osgeo/gdal container (see bake_terrain.sh) so nothing is
installed on the host. Idempotent and parameterised: re-running overwrites
the outputs.

Pipeline:
  1. Downsample the full-res DEM to <= --target px on the longest edge,
     assigning the source CRS. NODATA-aware averaging (average resampling
     excludes nodata cells), preserving georeferencing so pixel size stays
     physically meaningful.
  2. Fill any remaining NODATA holes (gdal FillNodata).
  3. Read true min/max elevation from the *downsampled* raster (the same
     data we encode), so the heightmap, meta.json and the scene all agree.
  4. retezat-heightmap.png : 16-bit elevation packed across R (high byte)
     and G (low byte) so smooth slopes don't band through 8-bit PNG decode.
  5. retezat-hillshade.png : gdaldem hillshade, for the static fallback.
  6. retezat-meta.json     : physical dimensions for the 3D scene.

Nothing about the terrain is hardcoded; every number is read from the data.
"""

import argparse
import json
import os
import sys

from osgeo import gdal, gdal_array
import numpy as np

gdal.UseExceptions()


def downsample(src_path, dst_path, target, epsg):
    """Downsample to <= target px on the longest edge, keeping aspect + CRS."""
    src = gdal.Open(src_path)
    w, h = src.RasterXSize, src.RasterYSize
    longest = max(w, h)
    scale = target / longest if longest > target else 1.0
    out_w, out_h = max(1, round(w * scale)), max(1, round(h * scale))
    print(f"  downsample {w}x{h} -> {out_w}x{out_h} (average)")
    gdal.Translate(
        dst_path, src,
        width=out_w, height=out_h,
        resampleAlg="average",
        outputSRS=f"EPSG:{epsg}",
        format="GTiff",
        creationOptions=["COMPRESS=DEFLATE", "TILED=YES"],
    )
    src = None


def fill_nodata(src_path, dst_path):
    """Fill NODATA holes left after averaging (small raster, cheap)."""
    gdal.Translate(dst_path, src_path, format="GTiff",
                   creationOptions=["COMPRESS=DEFLATE", "TILED=YES"])
    ds = gdal.Open(dst_path, gdal.GA_Update)
    band = ds.GetRasterBand(1)
    gdal.FillNodata(targetBand=band, maskBand=None,
                    maxSearchDist=100, smoothingIterations=0)
    band.FlushCache()
    ds = None


def read_dem(path):
    """Return (array float32 with nan for nodata, geotransform, pixel_size_m)."""
    ds = gdal.Open(path)
    band = ds.GetRasterBand(1)
    arr = band.ReadAsArray().astype(np.float32)
    nodata = band.GetNoDataValue()
    if nodata is not None:
        arr[arr == nodata] = np.nan
    gt = ds.GetGeoTransform()
    pixel_size = abs(gt[1])
    ds = None
    return arr, gt, pixel_size


def write_heightmap(arr, min_e, max_e, dst_path):
    """Pack elevation into 16 bits across R (hi byte) and G (lo byte)."""
    rng = max_e - min_e
    norm = np.clip((arr - min_e) / rng, 0.0, 1.0)
    norm = np.nan_to_num(norm, nan=0.0)               # any leftover holes -> floor
    h16 = np.rint(norm * 65535.0).astype(np.uint16)
    r = (h16 >> 8).astype(np.uint8)                   # high byte
    g = (h16 & 0xFF).astype(np.uint8)                 # low byte
    b = np.zeros_like(r)                              # unused
    rgb = np.stack([r, g, b], axis=0)                 # (bands, rows, cols)

    rows, cols = r.shape
    mem = gdal.GetDriverByName("MEM").Create("", cols, rows, 3, gdal.GDT_Byte)
    for i in range(3):
        mem.GetRasterBand(i + 1).WriteArray(rgb[i])
    gdal.GetDriverByName("PNG").CreateCopy(dst_path, mem)
    mem = None


def write_hillshade(dem_path, dst_path, z_factor):
    gdal.DEMProcessing(
        dst_path, dem_path, "hillshade",
        format="PNG", zFactor=z_factor, azimuth=315, altitude=45,
        computeEdges=True,
    )


def main():
    ap = argparse.ArgumentParser(description=__doc__,
                                 formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("--input", required=True, help="path to .asc DTM")
    ap.add_argument("--outdir", required=True, help="site asset dir")
    ap.add_argument("--scratch", default=".scratch", help="intermediate dir")
    ap.add_argument("--target", type=int, default=2048,
                    help="longest edge of baked assets, px")
    ap.add_argument("--epsg", type=int, default=3844, help="source CRS code")
    ap.add_argument("--prefix", default="retezat", help="output filename prefix")
    ap.add_argument("--hillshade-z", type=float, default=2.0,
                    help="vertical exaggeration for the fallback hillshade")
    args = ap.parse_args()

    os.makedirs(args.outdir, exist_ok=True)
    os.makedirs(args.scratch, exist_ok=True)
    small = os.path.join(args.scratch, "dem_small.tif")
    filled = os.path.join(args.scratch, "dem_filled.tif")

    print("[1/5] downsampling full-res DEM (reads the whole raster once)…")
    downsample(args.input, small, args.target, args.epsg)

    print("[2/5] filling NODATA holes…")
    fill_nodata(small, filled)

    print("[3/5] reading true elevation range from baked DEM…")
    arr, gt, pixel_size = read_dem(filled)
    min_e = float(np.nanmin(arr))
    max_e = float(np.nanmax(arr))
    rows, cols = arr.shape
    print(f"  min={min_e:.3f} m  max={max_e:.3f} m  range={max_e - min_e:.3f} m")
    print(f"  {cols}x{rows} px  pixel={pixel_size:.4f} m")

    print("[4/5] writing heightmap + hillshade PNGs…")
    write_heightmap(arr, min_e, max_e,
                    os.path.join(args.outdir, f"{args.prefix}-heightmap.png"))
    write_hillshade(filled,
                    os.path.join(args.outdir, f"{args.prefix}-hillshade.png"),
                    args.hillshade_z)

    print("[5/5] writing meta.json…")
    meta = {
        "minElev": round(min_e, 3),
        "maxElev": round(max_e, 3),
        "widthPx": cols,
        "heightPx": rows,
        "pixelSizeM": round(pixel_size, 4),
        "verticalRangeM": round(max_e - min_e, 3),
        "horizontalExtentM": round(cols * pixel_size, 1),
    }
    with open(os.path.join(args.outdir, f"{args.prefix}-meta.json"), "w") as f:
        json.dump(meta, f, indent=2)
    print(json.dumps(meta, indent=2))
    print("done.")


if __name__ == "__main__":
    sys.exit(main())
