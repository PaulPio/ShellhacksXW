import { useEffect, useState } from "react";
import { supabase } from "../lib/supabaseClient";

interface Stats {
  sampleCount: number | null;
  collectionStart: string | null;
  facilityCount: number | null;
  unreliableCount: number | null;
}

const KEY = [
  {
    label: "live",
    badgeClass: "badge-live",
    description: "A real reading from the FIU parking API.",
  },
  {
    label: "modelled",
    badgeClass: "badge-modelled",
    description:
      "Derived from real registrar section data, then calibrated against observed occupancy.",
  },
  {
    label: "simulated",
    badgeClass: "badge-simulated",
    description:
      "Not enough calibration history yet — falls back to the lot's current live reading.",
  },
];

export default function ProvenancePage() {
  const [stats, setStats] = useState<Stats>({
    sampleCount: null,
    collectionStart: null,
    facilityCount: null,
    unreliableCount: null,
  });

  useEffect(() => {
    async function load() {
      const [{ count: sampleCount }, { data: earliest }, facilities] = await Promise.all([
        supabase.from("pantherpark_occupancy_snapshots").select("*", { count: "exact", head: true }),
        supabase.from("pantherpark_occupancy_snapshots").select("ts").order("ts", { ascending: true }).limit(1),
        supabase.from("pantherpark_facilities").select("id,is_unreliable,display_hidden"),
      ]);

      const visibleFacilities = (facilities.data ?? []).filter((f) => !f.display_hidden);
      setStats({
        sampleCount: sampleCount ?? null,
        collectionStart: earliest && earliest[0] ? earliest[0].ts : null,
        facilityCount: visibleFacilities.length,
        unreliableCount: visibleFacilities.filter((f) => f.is_unreliable).length,
      });
    }
    load();
  }, []);

  const collectionStartLabel = stats.collectionStart
    ? new Date(stats.collectionStart).toLocaleString(undefined, {
        weekday: "short",
        hour: "numeric",
        minute: "2-digit",
      })
    : "…";

  return (
    <div className="page">
      <div className="page-header">
        <span className="eyebrow">Transparency</span>
        <h1>Data provenance</h1>
        <p className="lede">
          Every number in PantherPark is tagged with where it came from. We never present a guess
          as a measurement.
        </p>
      </div>

      <div className="provenance-key">
        {KEY.map((row) => (
          <div key={row.label} className="provenance-key-row">
            <span>
              <span className={`badge ${row.badgeClass}`}>{row.label}</span>
            </span>
            <span>{row.description}</span>
          </div>
        ))}
      </div>

      <div className="stat-panel">
        <div className="stat-figure">
          {stats.sampleCount !== null ? stats.sampleCount.toLocaleString() : "…"}
        </div>
        <div className="stat-caption">readings collected since {collectionStartLabel}</div>
        <div className="stat-notes">
          <span>
            {stats.facilityCount ?? "…"} facilities tracked · {stats.unreliableCount ?? 0} currently
            flagged unreliable (occupancy exceeds reported capacity — e.g. event-day overshoot).
          </span>
          <span>
            Collection started on a weekend, so weekday demand calibration is still building up.
            Expect <strong>simulated</strong> tags until enough weekday samples land.
          </span>
        </div>
      </div>

      <h2 className="section-title" style={{ marginTop: 48 }}>
        Modelled campus demand curve
      </h2>
      <p className="muted" style={{ marginTop: 20 }}>
        Built from real Fall 2026 registrar sections, filtered to in-person classes at MMC. This
        shapes every lot's predicted demand; calibration then scales it per lot using live observed
        occupancy.
      </p>
      <div className="chart-frame">
        <img src="/demand_chart_campus.png" alt="Campus-wide parking demand curve by weekday" />
      </div>
    </div>
  );
}
