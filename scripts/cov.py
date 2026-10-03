#!/usr/bin/env python3
"""Design coverage gate: p100 vs poster, r=1 device px, 390 at DPR 2.

Captures the final canvas/poster screenshots via check-hero-coverage.mjs
(device pixels, omitBackground, r=1) and reprints the scored table.
"""
from __future__ import annotations

import json
import subprocess
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / "test-results" / "hero-k1-coverage"


def main() -> int:
    cmd = ["node", str(ROOT / "scripts" / "check-hero-coverage.mjs")]
    proc = subprocess.run(cmd, cwd=ROOT)
    path = OUT / "coverage.json"
    if path.exists():
        rows = json.loads(path.read_text())
        print("cov.py r=1 device-px (390 DPR 2, 1440 DPR 1)")
        print("| viewport | theme | p100-in-poster | poster-in-p100 | chip ST | interior |")
        print("| --- | --- | ---: | ---: | ---: | ---: |")
        for row in rows:
            print(
                f"| {row['viewport']} | {row['theme']} | {row['liveInPoster']}% | "
                f"{row['posterInLive']}% | {row['chipSeeThrough']} | {row['chipInterior']} |"
            )
    return proc.returncode

if __name__ == "__main__":
    raise SystemExit(main())
