# PantherPark — 3-minute demo script

## Setup before walking on stage

- Collector has been running since well before the demo (do not start it live).
- Log in ahead of time on one browser tab as `pantherpark.demo@shellhacks.dev`
  (don't sign up live -- Supabase's free-tier confirmation email is
  rate-limited and unreliable on stage).
- Have `FIU_PRNT_SCH.pdf` (or a real schedule PDF/screenshot) ready to upload.
- If judged on a weekday, no `DEMO_NOW` override is needed. If judging happens
  on a weekend, set `DEMO_NOW` (e.g. `DEMO_NOW=2026-09-28T14:50:00` for a
  Monday early afternoon) in `backend/.env` before starting the backend, so
  the leave-now banner and predictions land on a realistic weekday moment
  even though the collector's underlying data is honestly logged in real
  time.

## Script (~3 minutes)

**[0:00–0:20] The problem.** "Every FIU student circles for parking. The
Panther Park API tells you what's full *right now* -- it has no way to tell
you what a lot will look like when your 11am class lets out. PantherPark
closes that gap: upload your schedule, get told when to leave and where to
park."

**[0:20–0:50] Live map.** Open `/map`. Point out the color-coded lots
refreshing live, Lot 7 flagged purple ("this lot is currently reporting more
cars than its stated capacity -- a real live data quirk, we flag it rather
than hide it"), and the hidden-facilities debug toggle.

**[0:50–1:40] Upload → plan.** Go to `/upload`, upload the real schedule PDF.
Point out: parsed table appears in seconds, two classes correctly flagged
"Online -- no parking needed" and excluded, two real in-person classes with
their actual building pulled straight off the schedule (not guessed).
Confirm the schedule -> land on `/plan`. Point out the sticky leave-now
banner at the top, walk through one class card: recommended lot, walk time,
confidence badge, "Get Directions" opening real Google Maps navigation to
that lot's exact coordinates.

**[1:40–2:10] Leave now + provenance.** Explain the leave-now banner factors
in the lot's live fill rate, not just a static countdown. Jump to
`/provenance`: real sample count, real collection-start timestamp, the
campus demand curve built from real Fall 2026 registrar sections, and the
live/modelled/simulated legend -- "we never show you a guess dressed up as a
measurement."

**[2:10–2:40] Account vs. guest.** Show the guest badge ("nothing is saved"),
then switch to the already-logged-in tab to show the same app with an
account -- same functionality, opt-in persistence.

**[2:40–3:00] Close.** "Every one of the 15 lots, every class time, every
building on this screen is real FIU data. Thanks."

## Fallback if the live FIU API is down during judging

- The collector's local backup (`data/snapshots.jsonl`) and the Supabase
  database retain everything collected before the outage -- the map, plan,
  and provenance pages all read from Supabase, not the live FIU API directly,
  so they keep working off the last-known state.
- Only the collector's next poll cycle would fail; it retries with backoff
  and resumes automatically once the API returns, logging the gap honestly
  rather than inventing data.
- If FIU's API is down for an extended period, say so directly: "the FIU API
  is down right now -- here's the exact real data we collected earlier
  today," and continue the demo from the existing database contents.
