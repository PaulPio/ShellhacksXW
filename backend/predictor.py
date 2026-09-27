"""
predict(facility, campus_curve, arrival_datetime) -> utilization_pct,
p_free_space, confidence, provenance.

Confidence/provenance tiers per the plan: 0 calibration samples -> simulated/low
(persistence forecast: assume current live occupancy holds); 1-4 samples ->
modelled/medium; 5+ samples -> modelled/high.
"""

from calibrator import calibrate_facility
from demand_model import bucket_index_for_minutes


def _p_free_space(pct, is_unreliable):
    if is_unreliable:
        return 0.1
    if pct is None:
        return 0.5
    if pct < 85:
        return 0.9
    if pct < 95:
        return 0.6
    if pct <= 100:
        return 0.25
    return 0.1


def predict(facility, campus_curve, arrival_datetime):
    """facility is a row from pantherpark_facilities (dict, has current_pct,
    is_unreliable). arrival_datetime is an aware datetime in America/New_York
    (typically from demo_clock.now())."""
    calib = calibrate_facility(facility["id"], campus_curve)
    n_samples = calib["n_samples"]

    if n_samples == 0:
        # Persistence forecast: honest "we don't have enough history to
        # model this, so we assume the current live reading holds" --
        # never a fabricated number.
        predicted_pct = facility.get("current_pct")
        confidence = "low"
        provenance = "simulated"
    else:
        weekday = arrival_datetime.weekday()
        bucket = bucket_index_for_minutes(arrival_datetime.hour * 60 + arrival_datetime.minute)
        modelled_units = campus_curve[weekday][bucket] if weekday <= 4 else 0
        predicted_pct = min(max(modelled_units * calib["scale"], 0), 100)
        confidence = "medium" if n_samples < 5 else "high"
        provenance = "modelled"

    is_unreliable = bool(facility.get("is_unreliable")) if n_samples == 0 else False

    return {
        "facility_id": facility["id"],
        "utilization_pct": predicted_pct,
        "p_free_space": _p_free_space(predicted_pct, is_unreliable),
        "confidence": confidence,
        "provenance": provenance,
        "n_samples": n_samples,
        "is_unreliable": is_unreliable,
    }
