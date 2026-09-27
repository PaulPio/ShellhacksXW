import { useEffect, useState } from "react";
import { supabase } from "../lib/supabaseClient";

interface Stats {
  sampleCount: number | null;
  collectionStart: string | null;
  facilityCount: number | null;
  unreliableCount: number | null;
}

function Badge({ label, color }: { label: string; color: string }) {
  return (
    <span
      style={{
        background: color,
        color: "white",
        fontSize: 12,
        fontWeight: 600,
        padding: "2px 10px",
        borderRadius: 999,
        marginRight: 6,
      }}
    >
      {label}
    </span>
  );
}

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
    <div style={{ maxWidth: 720, margin: "24px auto", padding: 16 }}>
      <h2>Data provenance</h2>
      <p style={{ color: "#6b7280", fontSize: 14 }}>
        Every number in PantherPark is tagged with where it came from. We never present a guess as a
        measurement.
      </p>

      <div style={{ display: "flex", gap: 8, margin: "12px 0" }}>
        <Badge label="live" color="#16a34a" />
        <span style={{ fontSize: 13 }}>a real reading from the FIU parking API</span>
      </div>
      <div style={{ display: "flex", gap: 8, margin: "12px 0" }}>
        <Badge label="modelled" color="#2563eb" />
        <span style={{ fontSize: 13 }}>derived from real registrar section data + calibration against observed occupancy</span>
      </div>
      <div style={{ display: "flex", gap: 8, margin: "12px 0" }}>
        <Badge label="simulated" color="#9ca3af" />
        <span style={{ fontSize: 13 }}>not enough calibration history yet -- falls back to the lot's current live reading</span>
      </div>

      <div
        style={{
          background: "#f9fafb",
          border: "1px solid #e5e7eb",
          borderRadius: 8,
          padding: 16,
          marginTop: 20,
        }}
      >
        <strong>
          {stats.sampleCount !== null ? stats.sampleCount.toLocaleString() : "…"} readings collected
        </strong>{" "}
        since {collectionStartLabel}
        <br />
        <span style={{ fontSize: 13, color: "#6b7280" }}>
          {stats.facilityCount ?? "…"} facilities tracked · {stats.unreliableCount ?? 0} currently flagged
          unreliable (occupancy exceeds reported capacity -- e.g. event-day overshoot)
        </span>
        <br />
        <span style={{ fontSize: 13, color: "#6b7280" }}>
          Collection started on a weekend, so weekday demand calibration is still building up -- see{" "}
          <strong>simulated</strong> tags above until enough weekday samples land.
        </span>
      </div>

      <h3 style={{ marginTop: 32 }}>Modelled campus-wide demand curve</h3>
      <p style={{ fontSize: 13, color: "#6b7280" }}>
        Built from real Fall 2026 registrar sections (filtered to MMC, in-person). This shapes every lot's
        predicted demand; calibration then scales it per lot using live observed occupancy.
      </p>
      <img src="/demand_chart_campus.png" alt="Campus-wide demand curve by weekday" style={{ maxWidth: "100%" }} />
    </div>
  );
}
