"""
Parses FIU's official "Schedule of Classes" PDF export (verified live
against a real fixture, FIU_PRNT_SCH.pdf, during planning -- see the plan's
Schedule ingest section for the exact structure).

pdfplumber's extract_tables() cleanly returns, per course, a 3-row table:
  row 0: "CODE-NUM (SECTION) - (REF) - Title - Units: N"
  row 1: column headers (Schedule | Location | Room | Instructor(s) | Course# | Status | Grade)
  row 2: the actual data row

Bytes are processed entirely in memory -- no disk writes anywhere in this
module, so the uploaded file is parsed and then discarded, never stored.
"""

import io
import re

import pdfplumber

from buildings import lookup_by_printed_name
from schemas import ParsedClass

HEADER_RE = re.compile(
    r"^([A-Z]{2,4})-(\d{4})\s+\(([^)]+)\)\s+-\s+\((\d+)\)\s+-\s+(.+?)\s+-\s+Units:\s*(\d+)$"
)

DAY_WORD_TO_TOKEN = {
    "mon": "M",
    "tue": "T",
    "tues": "T",
    "wed": "W",
    "thu": "Th",
    "thur": "Th",
    "thurs": "Th",
    "fri": "F",
}

AMPM_TIME_RE = re.compile(r"(\d{1,2}):(\d{2})(AM|PM)")


def _clean(text):
    return re.sub(r"\s+", " ", (text or "")).strip()


def _convert_ampm(hh, mm, ampm):
    hh = int(hh)
    if ampm == "PM" and hh != 12:
        hh += 12
    if ampm == "AM" and hh == 12:
        hh = 0
    return f"{hh:02d}:{mm}"


def _parse_schedule_cell(raw):
    """Returns (days, start, end). Empty days + None times for
    'No Meeting Days' (fully async) sections."""
    text = _clean(raw)
    if text.startswith("No Meeting Days"):
        return [], None, None

    day_match = re.search(r"Days:\s*([A-Za-z ]+?)\s+\d{1,2}:\d{2}(?:AM|PM)", text)
    days = []
    if day_match:
        for word in day_match.group(1).split():
            token = DAY_WORD_TO_TOKEN.get(word.lower())
            if token:
                days.append(token)

    times = AMPM_TIME_RE.findall(text)
    start = _convert_ampm(*times[0]) if len(times) >= 1 else None
    end = _convert_ampm(*times[1]) if len(times) >= 2 else None
    return days, start, end


def _parse_room_cell(raw):
    """Returns (is_online, building_text_without_room_number)."""
    text = _clean(raw)
    if not text or "online course" in text.lower():
        return True, None
    # strip a trailing room token, e.g. "Academic Health Center 5 212A" -> "Academic Health Center 5"
    match = re.match(r"^(.*?)\s+(\S+)$", text)
    building_text = match.group(1) if match else text
    return False, building_text


def _parse_location_cell(raw):
    text = _clean(raw)
    return text.lower().startswith("fiu on")  # "FIU Online Live" / "FIU On-line"


def parse_pdf_bytes(file_bytes: bytes) -> list[ParsedClass]:
    classes = []
    with pdfplumber.open(io.BytesIO(file_bytes)) as pdf:
        for page in pdf.pages:
            for table in page.extract_tables():
                if len(table) < 3:
                    continue  # not a course block we recognize
                header_line = _clean(table[0][0])
                match = HEADER_RE.match(header_line)
                if not match:
                    continue  # skip anything that doesn't match the known header shape

                subject, catalog_number, section, ref, title, units = match.groups()
                data_row = table[2]
                schedule_cell, location_cell, room_cell = data_row[0], data_row[1], data_row[2]

                days, start, end = _parse_schedule_cell(schedule_cell)
                room_is_online, building_text = _parse_room_cell(room_cell)
                location_is_online = _parse_location_cell(location_cell)
                is_online = room_is_online or location_is_online or not days

                building_lookup = None if is_online else lookup_by_printed_name(building_text)

                classes.append(
                    ParsedClass(
                        course=f"{subject} {catalog_number}",
                        section=section,
                        title=title,
                        days=days,
                        start=start,
                        end=end,
                        is_online=is_online,
                        building=building_lookup["name"] if building_lookup else None,
                        building_code=building_lookup["code"] if building_lookup else None,
                        building_source="printed" if building_lookup else None,
                        latitude=building_lookup["latitude"] if building_lookup else None,
                        longitude=building_lookup["longitude"] if building_lookup else None,
                    )
                )
    return classes


if __name__ == "__main__":
    with open("../FIU_PRNT_SCH.pdf", "rb") as f:
        data = f.read()
    for c in parse_pdf_bytes(data):
        print(c.model_dump())
