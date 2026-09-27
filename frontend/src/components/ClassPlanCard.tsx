import type { ClassPlan, RecommendedLot } from "../lib/api";

const PROVENANCE_COLOR: Record<string, string> = {
  live: "#16a34a",
  modelled: "#2563eb",
  simulated: "#9ca3af",
};

function ProvenanceBadge({ provenance, confidence }: { provenance: string; confidence: string }) {
  return (
    <span
      style={{
        fontSize: 11,
        fontWeight: 600,
        color: "white",
        background: PROVENANCE_COLOR[provenance] ?? "#9ca3af",
        padding: "2px 8px",
        borderRadius: 999,
      }}
    >
      {provenance} · {confidence}
    </span>
  );
}

function LotRow({ lot, primary }: { lot: RecommendedLot; primary?: boolean }) {
  return (
    <div
      style={{
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        padding: "8px 0",
        borderBottom: primary ? "none" : "1px solid #f3f4f6",
      }}
    >
      <div>
        <strong>{lot.full_name ?? lot.name}</strong>
        {lot.is_unreliable && <span style={{ color: "#8b5cf6", marginLeft: 6 }}>⚠ unreliable</span>}
        <div style={{ fontSize: 12, color: "#6b7280" }}>
          {lot.utilization_pct !== null ? `${lot.utilization_pct.toFixed(0)}% full` : "no data"} ·{" "}
          {lot.walk_minutes} min walk · <ProvenanceBadge provenance={lot.provenance} confidence={lot.confidence} />
        </div>
      </div>
      <a href={lot.maps_url} target="_blank" rel="noreferrer" style={{ fontSize: 13, whiteSpace: "nowrap" }}>
        Get Directions →
      </a>
    </div>
  );
}

export default function ClassPlanCard({ plan }: { plan: ClassPlan }) {
  const arrival = new Date(plan.target_arrival);

  return (
    <div style={{ border: "1px solid #e5e7eb", borderRadius: 8, padding: 16, marginBottom: 16 }}>
      <div style={{ display: "flex", justifyContent: "space-between" }}>
        <h3 style={{ margin: 0 }}>{plan.course}</h3>
        <span style={{ fontSize: 13, color: "#6b7280" }}>
          {arrival.toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" })}{" "}
          {arrival.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" })}
        </span>
      </div>

      <div style={{ marginTop: 8 }}>
        <LotRow lot={plan.recommended} primary />
      </div>

      {plan.alternates.length > 0 && (
        <details style={{ marginTop: 4 }}>
          <summary style={{ fontSize: 13, color: "#2563eb", cursor: "pointer" }}>
            {plan.alternates.length} alternate{plan.alternates.length > 1 ? "s" : ""}
          </summary>
          {plan.alternates.map((lot) => (
            <LotRow key={lot.facility_id} lot={lot} />
          ))}
        </details>
      )}

      {plan.fallback_chain.length > 0 && (
        <p style={{ fontSize: 12, color: "#b91c1c", marginTop: 8 }}>
          If full, next on the wayfinding loop: {plan.fallback_chain.map((f) => f.name).join(" → ")}
        </p>
      )}
    </div>
  );
}
