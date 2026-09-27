"""Thin Supabase REST (PostgREST) helper shared by calibrator/predictor/
recommender/main. Uses the anon key -- read-only, RLS-safe (SELECT is
public on the facilities/snapshots tables)."""

import os

import requests
from dotenv import load_dotenv

load_dotenv()

SUPABASE_URL = os.environ.get("SUPABASE_URL", "https://bxjdarssqxsgequahzzg.supabase.co")
SUPABASE_ANON_KEY = os.environ["SUPABASE_ANON_KEY"]

HEADERS = {"apikey": SUPABASE_ANON_KEY, "Authorization": f"Bearer {SUPABASE_ANON_KEY}"}


def get_all_facilities():
    resp = requests.get(
        f"{SUPABASE_URL}/rest/v1/pantherpark_facilities",
        params={"select": "*"},
        headers=HEADERS,
        timeout=15,
    )
    resp.raise_for_status()
    return resp.json()


def get_facility(facility_id):
    resp = requests.get(
        f"{SUPABASE_URL}/rest/v1/pantherpark_facilities",
        params={"select": "*", "id": f"eq.{facility_id}"},
        headers=HEADERS,
        timeout=15,
    )
    resp.raise_for_status()
    rows = resp.json()
    return rows[0] if rows else None


def get_recent_snapshots(facility_id, limit=5000):
    resp = requests.get(
        f"{SUPABASE_URL}/rest/v1/pantherpark_occupancy_snapshots",
        params={
            "select": "ts,occupancy_pct",
            "facility_id": f"eq.{facility_id}",
            "order": "ts.desc",
            "limit": limit,
        },
        headers=HEADERS,
        timeout=15,
    )
    resp.raise_for_status()
    return resp.json()
