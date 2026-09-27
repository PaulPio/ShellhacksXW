import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { getPlan, type ClassPlan, type ParsedClass } from "../lib/api";
import ClassPlanCard from "../components/ClassPlanCard";
import LeaveNowBanner from "../components/LeaveNowBanner";

export default function PlanPage() {
  const [plans, setPlans] = useState<ClassPlan[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [classCount, setClassCount] = useState(0);

  useEffect(() => {
    const raw = sessionStorage.getItem("pantherpark_classes");
    const classes: ParsedClass[] = raw ? JSON.parse(raw) : [];
    setClassCount(classes.length);
    if (classes.length === 0) return;

    getPlan(classes)
      .then((res) => setPlans(res.plans))
      .catch((err) => setError(err instanceof Error ? err.message : String(err)));
  }, []);

  if (classCount === 0) {
    return (
      <div style={{ padding: 16 }}>
        <p>
          No schedule loaded yet. <Link to="/upload">Upload one first →</Link>
        </p>
      </div>
    );
  }

  return (
    <div>
      {plans && plans.length > 0 && <LeaveNowBanner plans={plans} />}
      <div style={{ maxWidth: 640, margin: "24px auto", padding: 16 }}>
        <h2>Your parking plan</h2>
        {error && <p style={{ color: "#b91c1c" }}>{error}</p>}
        {!plans && !error && <p>Building your plan…</p>}
        {plans && plans.length === 0 && <p>No in-person classes with a known building to plan for.</p>}
        {plans?.map((plan, i) => (
          <ClassPlanCard key={i} plan={plan} />
        ))}
      </div>
    </div>
  );
}
