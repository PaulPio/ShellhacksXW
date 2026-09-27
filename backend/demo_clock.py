"""
Single now() accessor used everywhere time-dependent (predictor, leave-now,
recommender, frontend "next class"). Lets the live demo be driven at a
realistic weekday time via DEMO_NOW even though the actual collection
window (a September weekend) has near-zero class-driven demand.
"""

import os
from datetime import datetime
from zoneinfo import ZoneInfo

EASTERN = ZoneInfo("America/New_York")


def now():
    override = os.environ.get("DEMO_NOW")
    if override:
        dt = datetime.fromisoformat(override)
        if dt.tzinfo is None:
            dt = dt.replace(tzinfo=EASTERN)
        return dt.astimezone(EASTERN)
    return datetime.now(EASTERN)
