#!/usr/bin/env python3
"""Install the D30 triplets photo and D55 final voice into this checkout.

Usage:
  python scripts/install-story55-media.py "<unpacked-media-bundle-directory>"

This script never commits, uploads, merges or alters player save data.
The site build copies public/ into dist/, not the root assets/ folder.
"""
from pathlib import Path
import sys, shutil, re

PHOTO = "triplets-baby-photo.jpg"
AUDIO = "ximeng-final-keywords.mp3"
CATALOG = Path(__file__).resolve().parents[1] / "src/story/story55/catalog.js"
PUBLIC_MEDIA = Path(__file__).resolve().parents[1] / "public/assets/story55"

def install(bundle):
    bundle = Path(bundle).resolve()
    src_dir = bundle / "assets/story55"
    src_photo, src_audio = src_dir / PHOTO, src_dir / AUDIO
    for path in (src_photo, src_audio):
        if not path.is_file() or path.stat().st_size == 0:
            raise SystemExit(f"Missing media: {path}")
    original = CATALOG.read_text(encoding="utf-8")
    replaced, matches = re.subn(
        r'("id": "triplets",\s*"title": "orphanage-archive\.enc",[^}]*?"asset":\s*)"[^"]*"',
        lambda m: m.group(1) + '"/assets/story55/' + PHOTO + '"',
        original, count=1)
    if matches != 1:
        raise SystemExit("Could not locate the exact triplets archive; no changes made.")
    final_path = "/assets/story55/" + AUDIO
    if re.search(r'"finalAudio":\s*"[^"]*"', replaced):
        replaced = re.sub(r'"finalAudio":\s*"[^"]*"', '"finalAudio": "' + final_path + '"', replaced, count=1)
    else:
        needle = '  "version": 1,\n'
        if needle not in replaced:
            raise SystemExit("Story version marker not found; no changes made.")
        replaced = replaced.replace(needle, needle + '  "finalAudio": "' + final_path + '",\n', 1)
    PUBLIC_MEDIA.mkdir(parents=True, exist_ok=True)
    shutil.copy2(src_photo, PUBLIC_MEDIA / PHOTO)
    shutil.copy2(src_audio, PUBLIC_MEDIA / AUDIO)
    CATALOG.write_text(replaced, encoding="utf-8")
    print("Installed D30 photo and D55 voice in public/assets/story55")
    print("Run npm test && npm run build:pages before merging.")

if __name__ == "__main__":
    if len(sys.argv) != 2:
        raise SystemExit("Usage: python scripts/install-story55-media.py <unpacked-media-bundle>")
    install(sys.argv[1])
