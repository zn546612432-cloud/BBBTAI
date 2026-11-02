"""Optimize the existing iOS icon atlases in the generated Pages output.

The original PNGs stay untouched; this transforms only dist/ and all its
versioned/preview copies. Runtime references are updated together so no
generated page can request a missing WebP.
"""
from __future__ import annotations

import hashlib
from pathlib import Path
import sys

from PIL import Image

ATLASES = ("glass-atlas.png", "glass-utilities.png")
TEXT_SUFFIXES = {".html", ".js", ".css"}
ROOT = Path(sys.argv[1] if len(sys.argv) > 1 else "dist")
if not ROOT.is_dir():
    raise SystemExit(f"Missing build folder: {ROOT}")

cache: dict[str, bytes] = {}
converted = []
for png in ROOT.rglob("*.png"):
    if png.name not in ATLASES or png.parent.name != "icons":
        continue
    digest = hashlib.sha256(png.read_bytes()).hexdigest()
    if digest not in cache:
        import io
        output = io.BytesIO()
        with Image.open(png) as image:
            image.save(output, format="WEBP", quality=94, method=6, exact=True)
        cache[digest] = output.getvalue()
    destination = png.with_suffix(".webp")
    destination.write_bytes(cache[digest])
    converted.append((png, destination))

if not converted:
    raise SystemExit("No icon atlases found to optimize")

rewritten = 0
for path in ROOT.rglob("*"):
    if not path.is_file() or path.suffix not in TEXT_SUFFIXES:
        continue
    source = path.read_text("utf-8")
    updated = source
    for name in ATLASES:
        updated = updated.replace("/icons/" + name, "/icons/" + name.removesuffix(".png") + ".webp")
    if source != updated:
        path.write_text(updated, "utf-8")
        rewritten += 1

# A build should never point at a missing optimized atlas.
for png, webp in converted:
    assert webp.is_file() and webp.stat().st_size > 0
print(f"Optimized {len(converted)} icon atlas copies ({len(cache)} unique images); updated {rewritten} generated files")
for name in ATLASES:
    original = next((p for p, _ in converted if p.name == name), None)
    if original:
        optimized = original.with_suffix(".webp")
        print(f"  {name}: {original.stat().st_size:,} -> {optimized.stat().st_size:,} bytes")
