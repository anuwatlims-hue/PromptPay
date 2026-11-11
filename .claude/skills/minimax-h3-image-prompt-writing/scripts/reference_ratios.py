#!/usr/bin/env python3
"""Print each image's display aspect ratio as '<Picture N> aspect_ratio W:H'.

Usage: python reference_ratios.py IMG [IMG ...]
Argument order is the <Picture N> order (N starts at 1). Reads headers only.
"""

import math
import sys

if not sys.argv[1:]:
    sys.stderr.write("usage: reference_ratios.py IMG [IMG ...]\n")
    sys.exit(2)

try:
    from PIL import Image
except ImportError:
    sys.stderr.write(
        "Pillow is missing for %s; install it with: python -m pip install Pillow\n"
        % sys.executable
    )
    sys.exit(3)

Image.MAX_IMAGE_PIXELS = None
sys.stderr.reconfigure(errors="backslashreplace")


def display_size(path):
    with Image.open(path) as im:
        w, h = im.size
        try:
            orientation = im.getexif().get(0x0112)
        except Exception as exc:
            sys.stderr.write(
                "warning: EXIF orientation unreadable for %s (%s); using stored size\n"
                % (path, exc)
            )
            orientation = None
    if orientation in (5, 6, 7, 8):
        w, h = h, w
    if w <= 0 or h <= 0:
        raise ValueError("zero image size")
    return w, h


for n, path in enumerate(sys.argv[1:], 1):
    try:
        w, h = display_size(path)
        g = math.gcd(w, h)
        print("<Picture %d> aspect_ratio %d:%d" % (n, w // g, h // g))
    except Exception as exc:
        sys.stderr.write("error: %s: %s\n" % (path, exc))
        print("<Picture %d> aspect_ratio unavailable" % n)
