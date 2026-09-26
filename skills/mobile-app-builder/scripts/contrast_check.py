#!/usr/bin/env python3
"""WCAG contrast audit for app palettes.

Usage:
  contrast_check.py palette.json            # {"dark": {...tokens}, "light": {...tokens}}
  contrast_check.py --pair "#8A92AE" "#0A0A0F"

Palette tokens understood (missing ones are skipped):
  surfaces:  bg, surface, surfaceAlt
  text:      text, textDim, textFaint, primary, gold, success, danger, violet
  accents:   primary, gold, success, danger, violet  (checked against onAccent)

Exits 1 if any pair is below the threshold (default 4.5, --min to change), so it can gate CI.
Only #RRGGBB colours are checked; rgba()/named colours are reported as skipped.
"""
import json
import sys

SURFACES = ["bg", "surface", "surfaceAlt"]
TEXT = ["text", "textDim", "textFaint", "primary", "gold", "success", "danger", "violet"]
ACCENTS = ["primary", "gold", "success", "danger", "violet"]


def lum(hex_colour: str) -> float:
    h = hex_colour.lstrip("#")
    if len(h) == 3:
        h = "".join(c * 2 for c in h)
    r, g, b = (int(h[i:i + 2], 16) / 255 for i in (0, 2, 4))
    f = lambda c: c / 12.92 if c <= 0.03928 else ((c + 0.055) / 1.055) ** 2.4
    return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b)


def ratio(a: str, b: str) -> float:
    x, y = sorted([lum(a), lum(b)], reverse=True)
    return (x + 0.05) / (y + 0.05)


def is_hex(v) -> bool:
    return isinstance(v, str) and v.startswith("#") and len(v.lstrip("#")) in (3, 6)


def audit(name: str, p: dict, minimum: float) -> int:
    fails = 0
    print(f"\n== {name}")
    for fg in TEXT:
        if not is_hex(p.get(fg)):
            continue
        cells = []
        for bg in SURFACES:
            if not is_hex(p.get(bg)):
                continue
            r = ratio(p[fg], p[bg])
            bad = r < minimum
            fails += bad
            cells.append(f"{bg}:{r:4.1f}{' FAIL' if bad else ''}")
        print(f"  {fg:10s} " + "  ".join(cells))
    if is_hex(p.get("onAccent")):
        for acc in ACCENTS:
            if is_hex(p.get(acc)):
                r = ratio(p["onAccent"], p[acc])
                bad = r < minimum
                fails += bad
                print(f"  onAccent on {acc:8s} {r:4.1f}{' FAIL' if bad else ''}")
    return fails


def main(argv):
    minimum = 4.5
    if "--min" in argv:
        i = argv.index("--min")
        minimum = float(argv[i + 1])
        del argv[i:i + 2]
    if len(argv) >= 3 and argv[0] == "--pair":
        r = ratio(argv[1], argv[2])
        print(f"{argv[1]} on {argv[2]}: {r:.2f}:1 {'OK' if r >= minimum else 'FAIL'}")
        return 0 if r >= minimum else 1
    if not argv:
        print(__doc__)
        return 2
    palettes = json.load(open(argv[0]))
    if all(isinstance(v, str) for v in palettes.values()):
        palettes = {"palette": palettes}
    fails = sum(audit(k, v, minimum) for k, v in palettes.items())
    print(f"\n{'ALL PASS' if not fails else f'{fails} pair(s) below {minimum}:1'}")
    return 1 if fails else 0


if __name__ == "__main__":
    sys.exit(main(sys.argv[1:]))
