"""
Client for the undocumented FIU public class search API
(https://classes.fiu.edu/api/...). Verified live during planning: bare
JSON array from /api/classes, no room/building field, campus in
{"MMC","BBC",None}.

Every response is cached to disk (data/cache/classes/) so repeated runs
during development never re-hit the live API for the same query -- per
the hard rule to cache external responses and avoid redundant requests.
"""

import hashlib
import json
from pathlib import Path

import requests

CLASSES_BASE = "https://classes.fiu.edu"
CACHE_DIR = Path(__file__).parent.parent / "data" / "cache" / "classes"
CACHE_DIR.mkdir(parents=True, exist_ok=True)

TERM_CODE = "1268"  # confirmed live = Fall 2026; no working /api/terms endpoint exists


def _cache_path(url):
    key = hashlib.sha256(url.encode()).hexdigest()[:24]
    return CACHE_DIR / f"{key}.json"


def _get_json_cached(url):
    cache_path = _cache_path(url)
    if cache_path.exists():
        return json.loads(cache_path.read_text(encoding="utf-8"))

    resp = requests.get(url, timeout=20)
    resp.raise_for_status()
    data = resp.json()
    cache_path.write_text(json.dumps({"url": url, "data": data}, indent=2), encoding="utf-8")
    return {"url": url, "data": data}


def search_courses(query, subject=None, limit=20):
    url = f"{CLASSES_BASE}/api/courses/search?q={query}&limit={limit}"
    if subject:
        url += f"&subject={subject}"
    return _get_json_cached(url)["data"]


def get_sections(subject, catalog_number, term_code=TERM_CODE):
    url = f"{CLASSES_BASE}/api/classes?subject={subject}&catalogNumber={catalog_number}&termCode={term_code}"
    return _get_json_cached(url)["data"]


SUBJECTS_FOR_DEMAND_MODEL = [
    # A representative spread across colleges, not exhaustive -- enough to
    # populate a real campus-wide demand curve within the hackathon's time
    # budget. Extending this list only ever adds more real sections, never
    # changes the modeling approach.
    "COP", "CAP", "CDA", "CEN", "CGS", "CIS",
    "MAC", "MAD", "MAP", "MAS", "STA",
    "PHY", "CHM", "BSC",
    "ENC", "ENG", "LIT", "SPC",
    "ACG", "FIN", "MAN", "MAR", "ECO", "QMB",
    "EEL", "EGN", "EGS", "EML",
    "PSY", "SYP", "SOC", "POS", "HIS",
]


def fetch_all_sections_for_demand_model(term_code=TERM_CODE):
    """Broad sweep across representative subjects. Every request is cached,
    so re-running this during development costs nothing after the first pass."""
    all_sections = []
    seen_ids = set()
    for subject in SUBJECTS_FOR_DEMAND_MODEL:
        courses = search_courses(subject, subject=subject, limit=50)
        catalog_numbers = sorted({c["catalogNumber"] for c in courses.get("courses", [])})
        for catalog_number in catalog_numbers:
            sections = get_sections(subject, catalog_number, term_code)
            for s in sections:
                if s["id"] not in seen_ids:
                    seen_ids.add(s["id"])
                    all_sections.append(s)
    return all_sections


if __name__ == "__main__":
    # Step 0 of Task 3, per the plan: print real raw values before writing
    # any parser -- confirm field formats instead of assuming them.
    sample = get_sections("COP", "3337", TERM_CODE)
    print(f"Fetched {len(sample)} real sections for COP 3337, termCode={TERM_CODE}\n")
    for s in sample[:5]:
        print(
            f"  days={s.get('days')!r}  startTime={s.get('startTime')!r}  "
            f"endTime={s.get('endTime')!r}  enrolled={s.get('enrolled')!r}  "
            f"capacity={s.get('capacity')!r}  campus={s.get('campus')!r}  "
            f"modality={s.get('modality')!r}"
        )
