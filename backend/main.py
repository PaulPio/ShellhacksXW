"""
PantherPark FastAPI backend. Handles compute the browser/DB can't do:
schedule ingest, predictions, recommendations, leave-now. The frontend
reads Supabase directly for live map data -- it only calls here for these.
"""

from datetime import datetime, timedelta

from fastapi import FastAPI, File, HTTPException, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

from demand_model import DAY_TO_WEEKDAY, build_campus_demand_curve
from demo_clock import now as demo_now
from ingest_pdf import parse_pdf_bytes
from leave_now import DEFAULT_BUFFER_MINUTES, compute_leave_now
from recommender import recommend_for_class
from schemas import IngestResponse, ParsedClass
from supabase_client import get_all_facilities

app = FastAPI(title="PantherPark API")

app.add_middleware(
    CORSMiddleware,
    # Vite shifts to the next free port (5174, 5175, ...) if 5173 is taken --
    # match any localhost port rather than hardcoding one.
    allow_origin_regex=r"http://localhost:\d+",
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/api/health")
def health():
    return {"status": "ok"}


_campus_curve_cache = None


def get_campus_curve():
    global _campus_curve_cache
    if _campus_curve_cache is None:
        _campus_curve_cache = build_campus_demand_curve()  # cached on disk after the first cold fetch
    return _campus_curve_cache


def next_occurrence(days, start_time, current):
    """Soonest datetime (>= current) that lands on one of `days` at
    `start_time` ("HH:MM"). None if unparseable -- caller must skip the
    class rather than guess a time."""
    if not days or not start_time:
        return None
    target_weekdays = {DAY_TO_WEEKDAY[d] for d in days if d in DAY_TO_WEEKDAY}
    if not target_weekdays:
        return None
    hour, minute = map(int, start_time.split(":"))
    for offset in range(8):  # a week plus one day of slack
        candidate_date = current + timedelta(days=offset)
        if candidate_date.weekday() in target_weekdays:
            candidate = candidate_date.replace(hour=hour, minute=minute, second=0, microsecond=0)
            if candidate >= current:
                return candidate
    return None


@app.post("/api/plan")
def plan(classes: list[ParsedClass]):
    curve = get_campus_curve()
    facilities = get_all_facilities()
    current = demo_now()

    plans = []
    for c in classes:
        if c.is_online or c.latitude is None or c.longitude is None:
            continue  # never guess a plan for a class with no real building
        arrival = next_occurrence(c.days, c.start, current)
        if arrival is None:
            continue
        result = recommend_for_class(c.model_dump(), facilities, curve, arrival)
        if result:
            result["leave_now"] = compute_leave_now(
                arrival, result["recommended"]["walk_minutes"], result["recommended"]["facility_id"]
            )
            plans.append(result)

    return {"plans": plans, "as_of": current.isoformat()}


class LeaveNowRequest(BaseModel):
    target_arrival: datetime
    walk_minutes: float
    facility_id: str
    buffer_minutes: int = DEFAULT_BUFFER_MINUTES


@app.post("/api/leave-now")
def leave_now_endpoint(req: LeaveNowRequest):
    return compute_leave_now(req.target_arrival, req.walk_minutes, req.facility_id, req.buffer_minutes)


@app.post("/api/ingest", response_model=IngestResponse)
async def ingest(file: UploadFile = File(...)):
    content_type = file.content_type or ""
    file_bytes = await file.read()  # in-memory only; never written to disk

    if content_type == "application/pdf" or file.filename.lower().endswith(".pdf"):
        classes = parse_pdf_bytes(file_bytes)
        return IngestResponse(classes=classes, source="pdf")

    if content_type.startswith("image/"):
        from ingest_image import parse_image_bytes

        classes = parse_image_bytes(file_bytes, content_type)
        return IngestResponse(classes=classes, source="image")

    raise HTTPException(400, f"Unsupported file type: {content_type or file.filename}")
