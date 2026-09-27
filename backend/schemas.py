"""Pydantic models shared across the FastAPI routes."""

from typing import Literal, Optional

from pydantic import BaseModel


class ParsedClass(BaseModel):
    course: str
    section: Optional[str] = None
    title: Optional[str] = None
    days: list[str]  # subset of ["M","T","W","Th","F"], empty for online/no-meeting
    start: Optional[str] = None  # "HH:MM" 24h, None if no meeting time
    end: Optional[str] = None
    is_online: bool = False
    building: Optional[str] = None
    building_code: Optional[str] = None
    building_source: Optional[Literal["printed"]] = None
    latitude: Optional[float] = None
    longitude: Optional[float] = None


class IngestResponse(BaseModel):
    classes: list[ParsedClass]
    source: Literal["pdf", "image"]
