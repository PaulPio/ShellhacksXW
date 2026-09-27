import type { ClassPlan, RecommendedLot } from "../lib/api";

const PROVENANCE_CLASS: Record<string, string> = {
  live: "badge-live",
  modelled: "badge-modelled",
  simulated: "badge-simulated",
};

/** Fullness is the one number students scan for, so it gets its own colour. */
function fullnessClass(pct: number | null): string {
  if (pct === null) return "";
  if (pct < 60) return "lot-fill-ok";
  if (pct < 85) return "lot-fill-warn";
  return "lot-fill-busy";
}

function ProvenanceBadge({ provenance, confidence }: { provenance: string; confidence: string }) {
  return (
    <span className={`badge ${PROVENANCE_CLASS[provenance] ?? "badge-simulated"}`}>
      {provenance} · {confidence}
    </span>
  );
}

function LotRow({ lot, primary }: { lot: RecommendedLot; primary?: boolean }) {
  return (
    <div className={primary ? "lot-row lot-row-primary" : "lot-row"}>
      <div>
        <span className="lot-name">{lot.full_name ?? lot.name}</span>
        {lot.is_unreliable && (
          <span className="badge badge-warn" style={{ marginLeft: 8 }}>
            Unreliable reading
          </span>
        )}
        <div className="lot-meta">
          <span className={fullnessClass(lot.utilization_pct)}>
            {lot.utilization_pct !== null ? `${lot.utilization_pct.toFixed(0)}% full` : "no data"}
          </span>
          <span className="lot-meta-sep">·</span>
          <span>{lot.walk_minutes} min walk</span>
          <ProvenanceBadge provenance={lot.provenance} confidence={lot.confidence} />
        </div>
      </div>
      <a
        href={lot.maps_url}
        target="_blank"
        rel="noreferrer"
        className={primary ? "btn btn-primary btn-sm" : "btn btn-ghost btn-sm"}
      >
        Directions
      </a>
    </div>
  );
}

export default function ClassPlanCard({ plan }: { plan: ClassPlan }) {
  const arrival = new Date(plan.target_arrival);

  return (
    <article className="plan-card">
      <div className="plan-card-head">
        <h3>{plan.course}</h3>
        <span className="plan-card-when">
          Arrive by{" "}
          {arrival.toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" })}{" "}
          {arrival.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" })}
        </span>
      </div>

      <div className="plan-card-body">
        <LotRow lot={plan.recommended} primary />

        {plan.alternates.length > 0 && (
          <details className="plan-alternates">
            <summary>
              {plan.alternates.length} alternate{plan.alternates.length > 1 ? "s" : ""}
            </summary>
            {plan.alternates.map((lot) => (
              <LotRow key={lot.facility_id} lot={lot} />
            ))}
          </details>
        )}

        {plan.fallback_chain.length > 0 && (
          <p className="plan-fallback">
            If it's full, the wayfinding loop sends you to{" "}
            {plan.fallback_chain.map((f) => f.name).join(" → ")}
          </p>
        )}
      </div>
    </article>
  );
}
