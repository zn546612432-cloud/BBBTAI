#!/usr/bin/env python3
"""Render an offline Macau WebP image from the committed OSM vector dataset.

No online tile provider is contacted. Pixel coordinates use Web Mercator, so
Leaflet imageOverlay displays the raster at the right geographic locations.
Attribution: © OpenStreetMap contributors, ODbL 1.0 (Geofabrik Macau extract).
"""
from __future__ import annotations
import json, math, pathlib
from PIL import Image, ImageDraw

MIN_LON, MAX_LON = 113.505, 113.612
MIN_LAT, MAX_LAT = 22.095, 22.235
WIDTH, HEIGHT = 2560, 3660

def merc_y(lat):
    a = math.radians(lat)
    return math.log(math.tan(math.pi / 4 + a / 2))

Y_TOP, Y_BOTTOM = merc_y(MAX_LAT), merc_y(MIN_LAT)

def pixel(point):
    lon, lat = point[:2]
    return (int((lon - MIN_LON) / (MAX_LON - MIN_LON) * WIDTH),
            int((Y_TOP - merc_y(lat)) / (Y_TOP - Y_BOTTOM) * HEIGHT))

def load_module(path, const):
    text = pathlib.Path(path).read_text(encoding="utf8").strip()
    prefix = "export const " + const + " = "
    assert text.startswith(prefix) and text.endswith(";"), path
    return json.loads(text[len(prefix):-1])["features"]

def iter_paths(geom):
    ty = geom.get("type")
    coords = geom.get("coordinates") or []
    if ty == "LineString": yield coords, False
    elif ty == "MultiLineString":
        for line in coords: yield line, False
    elif ty == "Polygon":
        for ring in coords: yield ring, True
    elif ty == "MultiPolygon":
        for poly in coords:
            for ring in poly: yield ring, True

def main():
    seed = load_module("src/apps/maps/data/offline-macau.js", "OFFLINE_MACAU")
    detail = load_module("src/apps/maps/data/offline-macau-detail.js", "OFFLINE_DETAILS")
    items = seed + detail
    assert len(items) > 10000, "offline road data missing"
    image = Image.new("RGB", (WIDTH, HEIGHT), "#b8d9e9")
    draw = ImageDraw.Draw(image)
    fills = {
        "land": "#f0eee8", "landuse": "#e9e8e1", "park": "#d0e4c7",
        "building": "#d9dbd6", "water": "#a9d0e5",
    }
    lines = {"rail": ("#93a3a0", 3), "road": ("#ffffff", 6),
             "road_major": ("#faedc5", 12)}
    order = ["land", "landuse", "park", "building", "water", "rail", "road", "road_major"]
    count = 0
    for kind in order:
        for feature in items:
            if feature.get("properties", {}).get("kind") != kind: continue
            geom = feature.get("geometry") or {}
            for path, polygon in iter_paths(geom):
                if len(path) < (3 if polygon else 2): continue
                pixels = [pixel(p) for p in path]
                if polygon:
                    draw.polygon(pixels, fill=fills.get(kind, "#d4e8cd"))
                    if kind == "land": draw.line(pixels, fill="#b5c7b9", width=2, joint="curve")
                elif kind in lines:
                    color, width = lines[kind]
                    draw.line(pixels, fill=color, width=width, joint="curve")
                count += 1
    out=pathlib.Path("public/apps/maps/macau-offline.webp")
    out.parent.mkdir(parents=True,exist_ok=True)
    image.save(out,format="WEBP",quality=87,method=6)
    print(f"Offline Macau raster: {out}, {out.stat().st_size} bytes, {count} drawn paths, 2560x3660")

if __name__ == "__main__": main()
