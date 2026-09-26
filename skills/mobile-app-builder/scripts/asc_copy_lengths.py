#!/usr/bin/env python3
"""Check App Store Connect copy against field limits and common rejection triggers.

Usage: asc_copy_lengths.py copy.json

copy.json keys (any subset): "App Name", "Subtitle", "Promotional Text", "Keywords",
"Description", "What's New", "App Review Notes", "Reply to App Review".

Checks:
  * character limits per field
  * Description contains a Terms of Use (EULA) link and a Privacy Policy link (3.1.2(c))
  * no "coming soon" / "next update" / "beta" wording (2.3 / 2.2)
  * keywords: no spaces after commas (wasted characters), no duplicates
Exit code 1 on any failure.
"""
import json
import re
import sys

LIMITS = {
    "App Name": 30, "Subtitle": 30, "Promotional Text": 170, "Keywords": 100,
    "Description": 4000, "What's New": 4000, "App Review Notes": 4000, "Reply to App Review": 4000,
}
RISKY = re.compile(r"\b(coming soon|next update|beta|placeholder|lorem ipsum|TODO)\b", re.I)


def main(path: str) -> int:
    copy = json.load(open(path))
    fails = 0
    for field, text in copy.items():
        limit = next((v for k, v in LIMITS.items() if field.lower().startswith(k.lower())), None)
        n = len(text)
        status = "" if limit is None or n <= limit else "  FAIL: over limit"
        fails += bool(status)
        print(f"{field:30s} {n:5d}/{limit if limit else '-'}{status}")
        if field.lower() != "app review notes" and RISKY.search(text):
            print(f"   WARN: risky wording: {RISKY.search(text).group(0)!r}")
    desc = next((v for k, v in copy.items() if k.lower().startswith("description")), None)
    if desc is not None:
        if "stdeula" not in desc and not re.search(r"terms of use", desc, re.I):
            print("   FAIL: Description has no Terms of Use (EULA) link (3.1.2(c))"); fails += 1
        if not re.search(r"privacy", desc, re.I):
            print("   WARN: Description has no Privacy Policy link")
    kw = next((v for k, v in copy.items() if k.lower().startswith("keywords")), None)
    if kw:
        parts = [p.strip().lower() for p in kw.split(",")]
        if ", " in kw:
            print("   WARN: spaces after commas waste keyword characters")
        dup = {p for p in parts if parts.count(p) > 1}
        if dup:
            print(f"   WARN: duplicate keywords: {sorted(dup)}")
    print("ALL PASS" if not fails else f"{fails} failure(s)")
    return 1 if fails else 0


if __name__ == "__main__":
    if len(sys.argv) != 2:
        print(__doc__); sys.exit(2)
    sys.exit(main(sys.argv[1]))
