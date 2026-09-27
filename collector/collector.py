"""
PantherPark collector: polls the live FIU Panther Park API and writes a
time series into Supabase (pantherpark_facilities + pantherpark_occupancy_snapshots).

Standalone by design: `python collector.py`, only depends on requests +
python-dotenv. Never imports from /backend.

There is no historical endpoint on the FIU API (verified) -- every minute
this isn't running is a permanently lost reading. Run this first and leave
it running.
"""

import json
import os
import time
from datetime import datetime, timezone
from pathlib import Path

import requests
from dotenv import load_dotenv

load_dotenv(Path(__file__).parent / ".env")

FIU_PARKING_BASE = os.environ["FIU_PARKING_BASE"]
SUPABASE_URL = os.environ["SUPABASE_URL"]
SUPABASE_SERVICE_ROLE_KEY = os.environ["SUPABASE_SERVICE_ROLE_KEY"]

SNAPSHOTS_JSONL = Path(__file__).parent.parent / "data" / "snapshots.jsonl"
SNAPSHOTS_JSONL.parent.mkdir(parents=True, exist_ok=True)

OCCUPANCY_POLL_SECONDS = 60
METADATA_REFRESH_SECONDS = 30 * 60
BACKOFF_SCHEDULE = [2, 4, 8, 16, 30]

SUPABASE_HEADERS = {
    "apikey": SUPABASE_SERVICE_ROLE_KEY,
    "Authorization": f"Bearer {SUPABASE_SERVICE_ROLE_KEY}",
    "Content-Type": "application/json",
}


def now_iso():
    return datetime.now(timezone.utc).isoformat()


def request_with_retry(method, url, **kwargs):
    """One request-per-cycle politeness for the FIU API; retries with
    backoff on failure. Returns the Response on success, None after
    exhausting the backoff schedule (caller must treat this cycle as a
    real gap, never invent/backfill data)."""
    last_exc = None
    for attempt, delay in enumerate([0] + BACKOFF_SCHEDULE):
        if delay:
            time.sleep(delay)
        try:
            resp = requests.request(method, url, timeout=15, **kwargs)
            if resp.status_code < 300:
                return resp
            last_exc = f"HTTP {resp.status_code}: {resp.text[:200]}"
        except requests.RequestException as exc:
            last_exc = str(exc)
    print(f"[{now_iso()}] request FAILED after {len(BACKOFF_SCHEDULE)} retries: {method} {url} -> {last_exc}")
    return None


def normalize_occupancy(facility_type, current_occupancy, max_occupancy):
    """Lot vs garage occupancy-key split, verified live against the real API
    (garages use {other,student}, lots use {total}; there is no shared shape)."""
    if facility_type == "lot":
        total = (current_occupancy or {}).get("total")
        cap = (max_occupancy or {}).get("total")
    else:  # garage
        co = current_occupancy or {}
        mo = max_occupancy or {}
        total = co.get("other", 0) + co.get("student", 0)
        cap = mo.get("other", 0) + mo.get("student", 0)

    is_unreliable = bool(cap) and total is not None and total > cap
    if total is None or not cap:
        pct_display = None
    else:
        pct_display = min(100.0 * total / cap, 100.0)

    return total, cap, pct_display, is_unreliable


def fetch_and_upsert_metadata():
    """GET /facilities: near-static metadata + a current-state snapshot.
    Called at startup and every ~30 min."""
    resp = request_with_retry("GET", f"{FIU_PARKING_BASE}/facilities")
    if resp is None:
        return None

    facilities = resp.json()
    rows = []
    for f in facilities:
        total, cap, pct, unreliable = normalize_occupancy(
            f["type"], f.get("current_occupancy"), f.get("max_occupancy")
        )
        rows.append(
            {
                "id": f["id"],
                "name": f["name"],
                "full_name": f.get("full_name"),
                "type": f["type"],
                "display_hidden": f.get("display_hidden", False),
                "latitude": f.get("latitude"),
                "longitude": f.get("longitude"),
                "max_occupancy_total": cap,
                "current_total": total,
                "current_pct": pct,
                "is_unreliable": unreliable,
                "last_polled_at": now_iso(),
                "raw_json": f,
            }
        )

    upsert_resp = request_with_retry(
        "POST",
        f"{SUPABASE_URL}/rest/v1/pantherpark_facilities?on_conflict=id",
        headers={**SUPABASE_HEADERS, "Prefer": "resolution=merge-duplicates,return=minimal"},
        data=json.dumps(rows),
    )
    if upsert_resp is None:
        print(f"[{now_iso()}] WARNING: metadata upsert failed, facilities table may be stale")
        return None

    print(f"[{now_iso()}] metadata refreshed: {len(rows)} facilities")
    return {row["id"]: {"name": row["name"], "type": row["type"]} for row in rows}


def fetch_occupancy():
    resp = request_with_retry("GET", f"{FIU_PARKING_BASE}/facilities/occupancy")
    if resp is None:
        return None
    return resp.json()


def write_local_backup(normalized_rows):
    with open(SNAPSHOTS_JSONL, "a", encoding="utf-8") as f:
        for row in normalized_rows:
            f.write(json.dumps(row) + "\n")


def push_occupancy(normalized_rows):
    """Two Supabase writes per cycle: upsert current state onto
    pantherpark_facilities, insert append-only rows into
    pantherpark_occupancy_snapshots. Returns True on full success."""
    facility_updates = [
        {
            "id": row["facility_id"],
            # name/type are included because Supabase's upsert (POST with
            # on_conflict) builds a real INSERT ... ON CONFLICT DO UPDATE
            # statement -- the INSERT side is validated against NOT NULL
            # constraints even though we only intend to update. Omitting
            # them causes a 23502 (not-null violation), confirmed live.
            "name": row["name"],
            "type": row["type"],
            "current_total": row["current_total"],
            "current_pct": row["occupancy_pct"],
            "is_unreliable": row["is_unreliable"],
            "last_polled_at": row["ts"],
        }
        for row in normalized_rows
    ]
    upsert_resp = request_with_retry(
        "POST",
        f"{SUPABASE_URL}/rest/v1/pantherpark_facilities?on_conflict=id",
        headers={**SUPABASE_HEADERS, "Prefer": "resolution=merge-duplicates,return=minimal"},
        data=json.dumps(facility_updates),
    )

    snapshot_rows = [
        {
            "facility_id": row["facility_id"],
            "ts": row["ts"],
            "current_total": row["current_total"],
            "max_total": row["max_total"],
            "occupancy_pct": row["occupancy_pct"],
            "is_unreliable": row["is_unreliable"],
        }
        for row in normalized_rows
    ]
    insert_resp = request_with_retry(
        "POST",
        f"{SUPABASE_URL}/rest/v1/pantherpark_occupancy_snapshots",
        headers={**SUPABASE_HEADERS, "Prefer": "return=minimal"},
        data=json.dumps(snapshot_rows),
    )

    return upsert_resp is not None and insert_resp is not None


def process_occupancy_cycle(facility_meta):
    raw = fetch_occupancy()
    if raw is None:
        return None

    ts = now_iso()  # one timestamp per cycle, shared by the local backup and the remote push
    normalized = []
    for f in raw:
        meta = facility_meta.get(f["id"], {})
        f_type = meta.get("type", f.get("type", "lot"))
        f_name = meta.get("name", f.get("name"))
        total, cap, pct, unreliable = normalize_occupancy(
            f_type, f.get("current_occupancy"), f.get("max_occupancy")
        )
        normalized.append(
            {
                "facility_id": f["id"],
                "name": f_name,
                "type": f_type,
                "ts": ts,
                "current_total": total,
                "max_total": cap,
                "occupancy_pct": pct,
                "is_unreliable": unreliable,
            }
        )

    write_local_backup(normalized)
    ok = push_occupancy(normalized)
    return normalized if ok else None


def main():
    print(f"[{now_iso()}] PantherPark collector starting")
    print(f"  FIU_PARKING_BASE = {FIU_PARKING_BASE}")
    print(f"  SUPABASE_URL     = {SUPABASE_URL}")

    facility_meta = fetch_and_upsert_metadata()
    if facility_meta is None:
        print(f"[{now_iso()}] FATAL: could not fetch initial facility metadata, exiting")
        return

    cycle = 0
    total_rows = 0
    next_metadata_refresh = time.monotonic() + METADATA_REFRESH_SECONDS
    next_tick = time.monotonic()

    while True:
        now_mono = time.monotonic()
        if now_mono >= next_metadata_refresh:
            refreshed = fetch_and_upsert_metadata()
            if refreshed is not None:
                facility_meta = refreshed
            next_metadata_refresh = now_mono + METADATA_REFRESH_SECONDS

        normalized = process_occupancy_cycle(facility_meta)
        if normalized is not None:
            cycle += 1
            total_rows += len(normalized)
            unreliable = [r for r in normalized if r["is_unreliable"]]
            unreliable_desc = (
                ", ".join(f"{r['name']} @{r['occupancy_pct']:.0f}%" for r in unreliable)
                if unreliable
                else "none"
            )
            print(
                f"[{now_iso()}] cycle #{cycle}, {len(normalized)} facilities, "
                f"{len(unreliable)} unreliable ({unreliable_desc}), {total_rows} rows total"
            )
        else:
            print(f"[{now_iso()}] cycle skipped (fetch/write failure after retries)")

        next_tick += OCCUPANCY_POLL_SECONDS
        sleep_for = next_tick - time.monotonic()
        if sleep_for > 0:
            time.sleep(sleep_for)
        else:
            next_tick = time.monotonic()  # fell behind; resync instead of catch-up spamming


if __name__ == "__main__":
    main()
