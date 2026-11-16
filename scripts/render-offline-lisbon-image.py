#!/usr/bin/env python3
"""Render a local map from BBBike's ODbL-licensed Lisbon OSM vector extract.

Pass the downloaded Lisbon.osm.pbf as the only argument. GDAL and Pillow
extract public roads, green spaces and coastline (no private addresses or
building ownership data). No map tiles are downloaded.
"""
import json
import math
import pathlib
import subprocess
import sys
import tempfile
from PIL import Image, ImageColor, ImageDraw, ImageFont

WEST, SOUTH, EAST, NORTH = -9.34, 38.65, -9.10, 38.80
WIDTH, HEIGHT = 3600, 2890
LAND, WATER = "#f0eee8", "#b8d9e9"

def merc(lat):
    return math.log(math.tan(math.pi / 4 + math.radians(lat) / 2))

def pixel(point):
    lon, lat = point[:2]
    return (round((lon - WEST) / (EAST - WEST) * (WIDTH - 1)),
            round((merc(NORTH) - merc(lat)) / (merc(NORTH) - merc(SOUTH)) * (HEIGHT - 1)))

def paths(geom):
    if not geom:
        return
    kind, coords = geom["type"], geom.get("coordinates", [])
    if kind == "GeometryCollection":
        for part in geom["geometries"]:
            yield from paths(part)
        return
    if kind == "LineString":
        yield coords
    elif kind in ("MultiLineString", "Polygon"):
        yield from coords
    elif kind == "MultiPolygon":
        for poly in coords:
            yield from poly

def extract(source, out, layer, fields, predicate):
    subprocess.run(["ogr2ogr", "-f", "GeoJSON", str(out), source, layer,
                    "-spat", str(WEST), str(SOUTH), str(EAST), str(NORTH),
                    "-where", predicate, "-select", fields, "-clipsrc", "spat_extent"], check=True)
    return json.loads(out.read_text())["features"]

def main():
    with tempfile.TemporaryDirectory(prefix="lisbon-map-") as directory:
        tmp = pathlib.Path(directory)
        lines = extract(sys.argv[1], tmp / "lines.geojson", "lines", "highway,other_tags",
                        """highway IN ('motorway','trunk','primary','secondary','tertiary','motorway_link','primary_link','secondary_link','residential','unclassified','living_street') OR other_tags LIKE '%"natural"=>"coastline"%'""")
        polys = extract(sys.argv[1], tmp / "polys.geojson", "multipolygons", "landuse,leisure,natural",
                        """landuse IN ('forest','grass','recreation_ground','meadow','farmland','residential','commercial','industrial') OR leisure IN ('park','garden','nature_reserve') OR natural IN ('wood','water','scrub','beach','sand')""")
    image = Image.new("RGB", (WIDTH, HEIGHT), LAND)
    draw = ImageDraw.Draw(image)
    coasts = [f for f in lines if '"natural"=>"coastline"' in (f["properties"].get("other_tags") or "")]
    assert len(coasts) > 10
    for feature in coasts:
        for path in paths(feature["geometry"]):
            draw.line([pixel(p) for p in path], fill="#a0c7d7", width=3)
    ImageDraw.floodfill(image, pixel((-9.24, 38.67)), ImageColor.getrgb(WATER))
    ImageDraw.floodfill(image, pixel((-9.33, 38.66)), ImageColor.getrgb(WATER))
    assert image.getpixel(pixel((-9.19, 38.76))) != image.getpixel(pixel((-9.24, 38.67))), "Coastline not closed"
    green = {"forest", "grass", "recreation_ground", "meadow", "farmland", "wood", "scrub", "park", "garden", "nature_reserve"}
    for f in polys:
        tags = f["properties"]
        if any(v in green for v in tags.values()):
            color = "#d4e6cb"
        elif tags.get("natural") == "water":
            color = WATER
        elif tags.get("natural") in ("beach", "sand"):
            color = "#f5e5b8"
        else:
            color = "#e8e7e0"
        for path in paths(f["geometry"]):
            if len(path) > 3:
                draw.polygon([pixel(p) for p in path], fill=color)
    major = {"motorway", "trunk", "primary", "secondary"}
    for level in (0, 1):
        for f in lines:
            road = f["properties"].get("highway")
            if not road or int(road in major) != level:
                continue
            for path in paths(f["geometry"]):
                points = [pixel(p) for p in path]
                if len(points) > 1:
                    draw.line(points, fill="#d8d9d2" if not level else "#ded8b9", width=5 if not level else 10, joint="curve")
                    draw.line(points, fill="#ffffff" if not level else "#fff1c8", width=3 if not level else 7, joint="curve")
    font = ImageFont.truetype("DejaVuSans.ttf", 28)
    large = ImageFont.truetype("DejaVuSans.ttf", 40)
    for name, lon, lat, prominent in [
        ("LISBOA", -9.14, 38.736, True), ("Oeiras", -9.31, 38.711, False),
        ("Caxias", -9.279, 38.708, False), ("Algés", -9.232, 38.709, False),
        ("Belém", -9.206, 38.697, False), ("Carnaxide", -9.247, 38.728, False),
        ("RIO TEJO", -9.23, 38.677, True), ("Amadora", -9.23, 38.758, False)
    ]:
        draw.text(pixel((lon, lat)), name, font=large if prominent else font,
                  fill="#567078", anchor="mm", stroke_width=2, stroke_fill="#f0eee8" if name != "RIO TEJO" else WATER)
    out = pathlib.Path("public/apps/maps/lisbon-offline.webp")
    image.save(out, format="WEBP", quality=88, method=6)
    print(f"{out}: {out.stat().st_size:,} bytes; {len(lines):,} road/coast features")

if __name__ == "__main__":
    main()
