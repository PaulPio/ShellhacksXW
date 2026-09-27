"""
Campus-wide (not per-lot) demand curve built from real Fall 2026 sections.

Per the plan: the live classes.fiu.edu API has no room/building field at
all, so there is no reliable way to assign each of the thousands of
registrar sections to a specific lot. A subject-code guess was tried and
dropped (proven wrong by the user's own real schedule -- a CS course
meeting at a health-sciences building). Instead this produces ONE shared
campus-wide arrival-demand shape per weekday/15-min bucket; calibrator.py
is what turns this into a per-lot prediction, using real observed
occupancy to learn each lot's share of campus-wide demand.
"""

from fiu_classes_client import fetch_all_sections_for_demand_model

DAY_TO_WEEKDAY = {"M": 0, "T": 1, "W": 2, "Th": 3, "F": 4}
WEEKDAY_NAMES = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"]

BUCKET_START_MIN = 6 * 60   # 6:00 AM
BUCKET_END_MIN = 22 * 60    # 10:00 PM
BUCKET_SIZE_MIN = 15
N_BUCKETS = (BUCKET_END_MIN - BUCKET_START_MIN) // BUCKET_SIZE_MIN

RAMP_UP_MIN = 15   # arrivals start ramping up 15 min before class start
RAMP_DOWN_MIN = 10  # lot drains over 10 min after class end


def parse_time_to_minutes(hhmm):
    """'11:00' -> 660. Confirmed live format: 24h zero-padded HH:MM, or
    None for sections with no meeting time."""
    if not hhmm:
        return None
    hours, minutes = hhmm.split(":")
    return int(hours) * 60 + int(minutes)


def is_kept_section(section):
    """MMC, in-person (has real meeting days + times). Confirmed live:
    online/no-meeting sections have campus=None and/or empty days/times --
    skipping them avoids silently inflating campus demand."""
    if section.get("campus") != "MMC":
        return False
    if not section.get("days"):
        return False
    if not section.get("startTime") or not section.get("endTime"):
        return False
    return True


def section_weight(section):
    """enrolled is populated in the live data (confirmed), capacity as a
    defensive fallback in case a future section has enrolled=0/None."""
    enrolled = section.get("enrolled")
    if enrolled:
        return float(enrolled)
    return float(section.get("capacity") or 0)


def trapezoid_value(t_min, start_min, end_min):
    """Trapezoid: linear ramp up over RAMP_UP_MIN before start, flat through
    the class, linear ramp down over RAMP_DOWN_MIN after end. Returns a
    multiplier in [0, 1]."""
    ramp_start = start_min - RAMP_UP_MIN
    ramp_down_end = end_min + RAMP_DOWN_MIN

    if t_min < ramp_start or t_min > ramp_down_end:
        return 0.0
    if t_min < start_min:
        return (t_min - ramp_start) / RAMP_UP_MIN
    if t_min <= end_min:
        return 1.0
    return 1.0 - (t_min - end_min) / RAMP_DOWN_MIN


def build_campus_demand_curve(sections=None):
    """Returns {weekday_index: [N_BUCKETS floats]}, one shared curve for
    every MMC lot -- see module docstring for why this is campus-wide,
    not per-lot."""
    if sections is None:
        sections = fetch_all_sections_for_demand_model()

    curve = {wd: [0.0] * N_BUCKETS for wd in range(5)}
    kept_count = 0

    for section in sections:
        if not is_kept_section(section):
            continue
        kept_count += 1
        start_min = parse_time_to_minutes(section["startTime"])
        end_min = parse_time_to_minutes(section["endTime"])
        weight = section_weight(section)

        for day_token in section["days"]:
            weekday = DAY_TO_WEEKDAY.get(day_token)
            if weekday is None:
                continue
            for bucket_idx in range(N_BUCKETS):
                bucket_mid = BUCKET_START_MIN + bucket_idx * BUCKET_SIZE_MIN + BUCKET_SIZE_MIN / 2
                factor = trapezoid_value(bucket_mid, start_min, end_min)
                if factor > 0:
                    curve[weekday][bucket_idx] += weight * factor

    print(f"demand_model: fetched {len(sections)} sections, kept {kept_count} (MMC, in-person)")
    return curve


def bucket_index_for_minutes(t_min):
    """Clamp to the modeled window [6am, 10pm)."""
    idx = (t_min - BUCKET_START_MIN) // BUCKET_SIZE_MIN
    return max(0, min(N_BUCKETS - 1, idx))


if __name__ == "__main__":
    curve = build_campus_demand_curve()
    for wd in range(5):
        peak_bucket = max(range(N_BUCKETS), key=lambda i: curve[wd][i])
        peak_min = BUCKET_START_MIN + peak_bucket * BUCKET_SIZE_MIN
        print(
            f"{WEEKDAY_NAMES[wd]}: peak demand {curve[wd][peak_bucket]:.0f} "
            f"at {peak_min // 60:02d}:{peak_min % 60:02d}"
        )
