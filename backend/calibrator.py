"""
Turns the campus-wide modelled demand curve into a per-lot scale factor,
learned from real observed occupancy. This is deliberately the step that
replaces per-lot building assignment (dropped -- see demand_model.py):
calibration learns "how much of campus-wide demand this lot absorbs"
directly from live data instead of guessing it from a building heuristic.

Zero-guard: the actual collection window starts on a September weekend,
which the Mon-Fri campus demand curve doesn't model at all -- so
n_samples will legitimately be 0 for days, not a bug. Returns a fixed
persistence fallback in that case, always paired with provenance="simulated"
so the caller never presents it as measured.
"""

import statistics
from datetime import datetime, timezone

from demand_model import N_BUCKETS, bucket_index_for_minutes
from demo_clock import EASTERN
from supabase_client import get_recent_snapshots


def _to_eastern(ts_str):
    dt = datetime.fromisoformat(ts_str.replace("Z", "+00:00"))
    if dt.tzinfo is None:
        dt = dt.replace(tzinfo=timezone.utc)
    return dt.astimezone(EASTERN)


def calibrate_facility(facility_id, campus_curve):
    """Returns {"scale": float|None, "n_samples": int}. scale is None only
    when n_samples == 0 -- caller must fall back to a persistence forecast."""
    rows = get_recent_snapshots(facility_id)

    ratios = []
    n_samples = 0
    for row in rows:
        pct = row.get("occupancy_pct")
        if pct is None:
            continue
        eastern_ts = _to_eastern(row["ts"])
        weekday = eastern_ts.weekday()  # Monday=0 ... Sunday=6
        if weekday > 4:
            continue  # weekend sample -- not represented in the Mon-Fri campus curve

        bucket = bucket_index_for_minutes(eastern_ts.hour * 60 + eastern_ts.minute)
        modelled = campus_curve[weekday][bucket]
        if modelled <= 0:
            continue  # can't form a ratio against zero modelled demand

        ratios.append(pct / modelled)
        n_samples += 1

    if n_samples == 0:
        return {"scale": None, "n_samples": 0}

    return {"scale": statistics.mean(ratios), "n_samples": n_samples}
