"""
"Leave now" recommendation: a target leave-by time (class start minus walk
time minus a buffer), adjusted by the recommended lot's live rate of
change -- if it's filling up fast right now, that pulls the urgency up a
level even if the static countdown alone would say there's still time.
"""

from datetime import datetime, timedelta, timezone

from demo_clock import now as demo_now
from supabase_client import get_recent_snapshots

DEFAULT_BUFFER_MINUTES = 12
FAST_FILL_THRESHOLD_PCT_PER_MIN = 0.5  # >0.5%/min sustained is a real, visible fill-up trend
TREND_WINDOW_MINUTES = 30


def _parse_ts(ts_str):
    dt = datetime.fromisoformat(ts_str.replace("Z", "+00:00"))
    if dt.tzinfo is None:
        dt = dt.replace(tzinfo=timezone.utc)
    return dt


def get_fill_rate_per_minute(facility_id):
    """Real observed slope over the last TREND_WINDOW_MINUTES, in %/min.
    Returns 0.0 (not "unknown") when there isn't enough history yet --
    the caller only uses this to escalate urgency, never to invent a trend."""
    rows = get_recent_snapshots(facility_id, limit=200)
    cutoff = datetime.now(timezone.utc) - timedelta(minutes=TREND_WINDOW_MINUTES)
    recent = [r for r in rows if r.get("occupancy_pct") is not None and _parse_ts(r["ts"]) >= cutoff]
    if len(recent) < 2:
        return 0.0

    recent.sort(key=lambda r: r["ts"])
    span_minutes = (_parse_ts(recent[-1]["ts"]) - _parse_ts(recent[0]["ts"])).total_seconds() / 60
    if span_minutes <= 0:
        return 0.0
    return (recent[-1]["occupancy_pct"] - recent[0]["occupancy_pct"]) / span_minutes


def compute_leave_now(target_arrival: datetime, walk_minutes: float, facility_id: str, buffer_minutes=DEFAULT_BUFFER_MINUTES):
    leave_by = target_arrival - timedelta(minutes=walk_minutes) - timedelta(minutes=buffer_minutes)
    current = demo_now()
    minutes_until_leave = (leave_by - current).total_seconds() / 60

    fill_rate = get_fill_rate_per_minute(facility_id)
    is_filling_fast = fill_rate > FAST_FILL_THRESHOLD_PCT_PER_MIN

    if minutes_until_leave <= 0:
        status = "leave_now"
    elif minutes_until_leave <= 15 or is_filling_fast:
        status = "leave_soon"
    else:
        status = "plenty_of_time"

    return {
        "leave_by": leave_by.isoformat(),
        "minutes_until_leave": round(minutes_until_leave, 1),
        "status": status,
        "fill_rate_pct_per_min": round(fill_rate, 2),
        "is_filling_fast": is_filling_fast,
    }
