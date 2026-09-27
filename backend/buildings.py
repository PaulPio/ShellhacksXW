"""
Building name/code -> approximate lat/lng lookup for FIU's MMC campus.

Deliberately NOT a subject->building heuristic (that approach was tried and
dropped -- see the plan's Demand model section: the user's own AI course
meets at a health-sciences building, proving subject code says nothing
about where a class actually meets). This module only answers "given a
building name/code that was actually printed on a schedule, where is it?"

Coordinates are manually looked up once and are APPROXIMATE except where a
facility in the live Panther Park API data already pins a matching
location exactly (PG1-6, and lots named directly after a building like
CCLC/SASC/ZEB) -- those reuse the verified real coordinates.
"""

# code -> (display name, latitude, longitude, is_exact)
BUILDINGS = {
    "GC":   ("Graham Center", 25.7565, -80.3737, False),
    "CASE": ("College of Engineering (CASE)", 25.7565, -80.3785, False),
    "AHC1": ("Academic Health Center 1", 25.7548, -80.3775, False),
    "AHC2": ("Academic Health Center 2", 25.7550, -80.3773, False),
    "AHC3": ("Academic Health Center 3", 25.7552, -80.3771, False),
    "AHC4": ("Academic Health Center 4", 25.7554, -80.3769, False),
    "AHC5": ("Academic Health Center 5", 25.7551, -80.3763, False),
    "CBC":  ("College of Business Complex", 25.7550, -80.3730, False),
    "DM":   ("Deuxieme Maison", 25.7568, -80.3737, False),
    "RB":   ("Ryder Business Building", 25.7555, -80.3725, False),
    "RDB":  ("Rafael Diaz-Balart Hall", 25.7558, -80.3723, False),
    "SIPA1": ("Steven J. Green School (SIPA 1)", 25.7590, -80.3720, False),
    "SIPA2": ("Steven J. Green School (SIPA 2)", 25.7592, -80.3718, False),
    "CP":   ("Chemistry and Physics Building", 25.7595, -80.3735, False),
    "VH":   ("Viertes Haus", 25.7566, -80.3743, False),
    "PC":   ("Primera Casa", 25.7568, -80.3745, False),
    "WRC":  ("Wellness & Recreation Center", 25.7530, -80.3775, False),
    "SASC": ("Student Academic Success Center", 25.755151, -80.370555, True),
    "GL":   ("Green Library", 25.7576, -80.3738, False),
    "PG1":  ("PG1: Gold Garage", 25.754794, -80.372083, True),
    "PG2":  ("PG2: Blue Garage", 25.753842, -80.372089, True),
    "PG3":  ("PG3: Panther Garage", 25.758427, -80.379818, True),
    "PG4":  ("PG4: Red Garage", 25.7600881, -80.3736621, True),
    "PG5":  ("PG5: Market Station", 25.7602896, -80.3710615, True),
    "PG6":  ("PG6: Tech Station", 25.760147, -80.374578, True),
    "EH":   ("Everglades Hall", 25.7595, -80.3765, False),
    "LVN":  ("Lakeview North", 25.7600, -80.3760, False),
    "LVS":  ("Lakeview South", 25.7598, -80.3758, False),
    "PH":   ("Panther Hall", 25.7605, -80.3765, False),
    "PVH":  ("Parkview Hall", 25.754591, -80.377257, True),
    "TAM":  ("Tamiami Hall", 25.7532, -80.3778, False),
    "BT":   ("Bacardi Building", 25.7570, -80.3730, False),
    "CSC":  ("Charles E. Perry Building (CSC)", 25.7573, -80.3742, False),
    "DC":   ("Discovery Hall (DC)", 25.7562, -80.3762, False),
    "ACC":  ("Ambassador / Athletic Convocation Center", 25.7528, -80.3804, False),
    "ASTRO": ("Astronomy Observatory", 25.7597, -80.3730, False),
    "BBS":  ("Biscayne Bay Sciences (MMC annex)", 25.7580, -80.3750, False),
    "CCLC": ("Lot 10: CCLC area building", 25.757195, -80.381231, True),
    "CFES": ("College of Fine & Engineering Sciences", 25.7563, -80.3782, False),
}

# Real full names printed on the FIU_PRNT_SCH.pdf fixture -> code.
# Extend this as more real schedules surface new printed name variants.
PRINTED_NAME_ALIASES = {
    "academic health center 1": "AHC1",
    "academic health center 2": "AHC2",
    "academic health center 3": "AHC3",
    "academic health center 4": "AHC4",
    "academic health center 5": "AHC5",
    "deuxieme maison": "DM",
    "primera casa": "PC",
    "viertes haus": "VH",
    "graham center": "GC",
    "green library": "GL",
    "wellness & recreation center": "WRC",
    "wellness and recreation center": "WRC",
    "ryder business building": "RB",
}


def lookup_by_code(code):
    entry = BUILDINGS.get(code.upper())
    if entry is None:
        return None
    name, lat, lng, is_exact = entry
    return {"code": code.upper(), "name": name, "latitude": lat, "longitude": lng, "is_exact": is_exact}


def lookup_by_printed_name(printed_text):
    """printed_text is whatever building name text was actually parsed off a
    student's schedule (PDF Room column or Gemini-extracted building field),
    already stripped of any trailing room number. Returns None if it can't
    be matched -- callers must exclude the class rather than guess."""
    if not printed_text:
        return None
    normalized = printed_text.strip().lower()

    code = PRINTED_NAME_ALIASES.get(normalized)
    if code:
        return lookup_by_code(code)

    # fall back to substring match against known display names / codes
    for code, (name, *_rest) in BUILDINGS.items():
        if normalized in name.lower() or normalized == code.lower():
            return lookup_by_code(code)

    return None
