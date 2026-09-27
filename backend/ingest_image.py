"""
Parses a schedule screenshot/photo via Gemini 3.8 Flash (gemini-3.8-flash),
confirmed working against the real API in smoke_test_gemini.py before this
module was written. Strict JSON via response_schema.

Image bytes are base64-encoded in memory only -- never written to disk, so
the upload is parsed and then discarded, matching the PDF path's privacy
guarantee.
"""

import json
import os

from dotenv import load_dotenv
from google import genai
from google.genai import types

from buildings import lookup_by_printed_name
from schemas import ParsedClass

load_dotenv()

_client = None


def _get_client():
    global _client
    if _client is None:
        _client = genai.Client(api_key=os.environ["GEMINI_API_KEY"])
    return _client


RESPONSE_SCHEMA = {
    "type": "object",
    "properties": {
        "classes": {
            "type": "array",
            "items": {
                "type": "object",
                "properties": {
                    "course": {"type": "string"},
                    "title": {"type": "string", "nullable": True},
                    "days": {
                        "type": "array",
                        "items": {"type": "string", "enum": ["M", "T", "W", "Th", "F"]},
                    },
                    "start": {"type": "string", "nullable": True, "description": "24h HH:MM or null"},
                    "end": {"type": "string", "nullable": True, "description": "24h HH:MM or null"},
                    "is_online": {"type": "boolean"},
                    "building": {
                        "type": "string",
                        "nullable": True,
                        "description": "Building name as printed, without room number. Null if online or not visible.",
                    },
                },
                "required": ["course", "days", "is_online"],
            },
        }
    },
    "required": ["classes"],
}

PROMPT = """This image is a screenshot of a university class schedule.
Extract every class listed. For each class return: course (code, e.g. "COP 3337"),
title if visible, days as a subset of ["M","T","W","Th","F"], start/end time in
24-hour "HH:MM" format (null if not shown or fully online/async), is_online
(true if the class has no physical meeting location), and building (the
building name exactly as printed, WITHOUT any room number -- null if online
or the building isn't visible). Do not guess a building from the course
subject -- only report what is actually printed. If you cannot read a field,
use null rather than guessing."""


def parse_image_bytes(image_bytes: bytes, mime_type: str) -> list[ParsedClass]:
    client = _get_client()
    response = client.models.generate_content(
        model="gemini-3.8-flash",
        contents=[
            types.Part.from_bytes(data=image_bytes, mime_type=mime_type),
            PROMPT,
        ],
        config=types.GenerateContentConfig(
            response_mime_type="application/json",
            response_schema=RESPONSE_SCHEMA,
        ),
    )

    parsed = json.loads(response.text)
    classes = []
    for raw in parsed.get("classes", []):
        is_online = raw.get("is_online", False) or not raw.get("days")
        building_lookup = None if is_online else lookup_by_printed_name(raw.get("building"))

        classes.append(
            ParsedClass(
                course=raw["course"],
                title=raw.get("title"),
                days=raw.get("days", []),
                start=raw.get("start"),
                end=raw.get("end"),
                is_online=is_online,
                building=building_lookup["name"] if building_lookup else None,
                building_code=building_lookup["code"] if building_lookup else None,
                building_source="printed" if building_lookup else None,
                latitude=building_lookup["latitude"] if building_lookup else None,
                longitude=building_lookup["longitude"] if building_lookup else None,
            )
        )
    return classes
