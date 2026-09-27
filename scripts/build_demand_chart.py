"""
Task 3 deliverable: build the campus-wide demand curve and render it as a
chart, so the AM/PM double-hump shape can be visually verified (and reused
later in the provenance panel).
"""

import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent.parent / "backend"))

import matplotlib

matplotlib.use("Agg")
import matplotlib.pyplot as plt

from demand_model import (
    BUCKET_SIZE_MIN,
    BUCKET_START_MIN,
    N_BUCKETS,
    WEEKDAY_NAMES,
    build_campus_demand_curve,
)

OUTPUT_DIR = Path(__file__).parent.parent / "data"
OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
FRONTEND_PUBLIC_DIR = Path(__file__).parent.parent / "frontend" / "public"


def bucket_hour_labels():
    hours = []
    for i in range(N_BUCKETS):
        minute = BUCKET_START_MIN + i * BUCKET_SIZE_MIN
        hours.append(minute / 60.0)
    return hours


def main():
    curve = build_campus_demand_curve()
    hours = bucket_hour_labels()

    fig, ax = plt.subplots(figsize=(10, 6))
    for wd in range(5):
        ax.plot(hours, curve[wd], label=WEEKDAY_NAMES[wd], linewidth=2)

    ax.set_xlabel("Hour of day")
    ax.set_ylabel("Modelled campus-wide demand (weighted enrollment)")
    ax.set_title("PantherPark: campus-wide arrival demand shape, Fall 2026 (modelled from real sections)")
    ax.set_xticks(range(6, 23, 2))
    ax.legend()
    ax.grid(True, alpha=0.3)

    out_path = OUTPUT_DIR / "demand_chart_campus.png"
    fig.savefig(out_path, dpi=130, bbox_inches="tight")
    print(f"Saved {out_path}")

    if FRONTEND_PUBLIC_DIR.exists():
        fig.savefig(FRONTEND_PUBLIC_DIR / "demand_chart_campus.png", dpi=130, bbox_inches="tight")
        print(f"Saved {FRONTEND_PUBLIC_DIR / 'demand_chart_campus.png'}")

    for wd in range(5):
        peak_idx = max(range(N_BUCKETS), key=lambda i: curve[wd][i])
        peak_min = BUCKET_START_MIN + peak_idx * BUCKET_SIZE_MIN
        print(f"  {WEEKDAY_NAMES[wd]}: peak {curve[wd][peak_idx]:.0f} at {peak_min // 60:02d}:{peak_min % 60:02d}")


if __name__ == "__main__":
    main()
