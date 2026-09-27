"""
Nearest-lot-with-availability recommender (per user direction: simpler and
more literal than a weighted score -- "closest lot that actually has
space"). Uses only real data: haversine distance to the class's printed
building, live/predicted occupancy from predictor.py, and the FIU API's own
wayfinding endpoint (/facilities/{id}/next) for fallbacks -- never an
invented routing algorithm.
"""

import math

import requests

from predictor import predict

FIU_PARKING_BASE = "https://api.parking.fiu.edu/api/v1"
AVAILABILITY_THRESHOLD = 0.3
WALK_SPEED_MPS = 1.3


def haversine_meters(lat1, lon1, lat2, lon2):
    R = 6371000
    phi1, phi2 = math.radians(lat1), math.radians(lat2)
    dphi = math.radians(lat2 - lat1)
    dlambda = math.radians(lon2 - lon1)
    a = math.sin(dphi / 2) ** 2 + math.cos(phi1) * math.cos(phi2) * math.sin(dlambda / 2) ** 2
    return 2 * R * math.asin(math.sqrt(a))


def maps_url(lat, lng):
    return f"https://www.google.com/maps/dir/?api=1&destination={lat},{lng}&travelmode=driving"


def _candidates_sorted_by_distance(building_lat, building_lng, facilities):
    non_hidden = [f for f in facilities if not f.get("display_hidden") and f.get("latitude") is not None]
    for f in non_hidden:
        f["_distance_m"] = haversine_meters(building_lat, building_lng, f["latitude"], f["longitude"])
    return sorted(non_hidden, key=lambda f: f["_distance_m"])


def _next_facility(facility_id, direction):
    resp = requests.get(f"{FIU_PARKING_BASE}/facilities/{facility_id}/next", params={"direction": direction}, timeout=10)
    if resp.status_code != 200:
        return None
    return resp.json()


def recommend_for_class(parsed_class, facilities, campus_curve, arrival_datetime):
    """parsed_class must have latitude/longitude (i.e. building_source ==
    'printed' -- online/unresolved classes should never reach here)."""
    candidates = _candidates_sorted_by_distance(parsed_class["latitude"], parsed_class["longitude"], facilities)

    scored = []
    for f in candidates:
        pred = predict(f, campus_curve, arrival_datetime)
        walk_minutes = f["_distance_m"] / WALK_SPEED_MPS / 60
        scored.append({"facility": f, "prediction": pred, "walk_minutes": walk_minutes})

    available = [s for s in scored if s["prediction"]["p_free_space"] >= AVAILABILITY_THRESHOLD]

    fallback_chain = []
    if available:
        chosen = available[0]
        alternates = available[1:3]
    elif scored:
        chosen = scored[0]  # nearest, even though predicted full -- still the best real option
        alternates = scored[1:3]
        # Walk the real wayfinding graph for "if this is full, try X" -- never invented.
        seen_ids = {chosen["facility"]["id"]}
        for direction in ("cw", "ccw"):
            next_hop = _next_facility(chosen["facility"]["id"], direction)
            if next_hop and next_hop.get("id") not in seen_ids:
                fallback_chain.append({"id": next_hop["id"], "name": next_hop.get("name")})
                seen_ids.add(next_hop["id"])
    else:
        return None  # no facilities at all -- shouldn't happen with real data, but never fabricate one

    def _serialize(entry):
        f, pred = entry["facility"], entry["prediction"]
        return {
            "facility_id": f["id"],
            "name": f["name"],
            "full_name": f.get("full_name"),
            "walk_minutes": round(entry["walk_minutes"], 1),
            "utilization_pct": pred["utilization_pct"],
            "p_free_space": pred["p_free_space"],
            "confidence": pred["confidence"],
            "provenance": pred["provenance"],
            "is_unreliable": pred["is_unreliable"],
            "maps_url": maps_url(f["latitude"], f["longitude"]),
        }

    return {
        "course": parsed_class["course"],
        "target_arrival": arrival_datetime.isoformat(),
        "recommended": _serialize(chosen),
        "alternates": [_serialize(a) for a in alternates],
        "fallback_chain": fallback_chain,
    }
