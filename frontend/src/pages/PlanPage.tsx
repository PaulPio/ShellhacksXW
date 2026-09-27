import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { getPlan, type ClassPlan, type ParsedClass } from "../lib/api";
import ClassPlanCard from "../components/ClassPlanCard";
import LeaveNowBanner from "../components/LeaveNowBanner";
import Spinner from "../components/Spinner";

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
      <div className="page">
        <div className="empty-state">
          <span className="eyebrow">No schedule yet</span>
          <h2>Upload a schedule to get a plan</h2>
          <p className="muted">
            We need your class times and buildings before we can tell you where to park.
          </p>
          <Link to="/upload" className="btn btn-primary">
            Upload your schedule
          </Link>
        </div>
      </div>
    );
  }

  return (
    <>
      {plans && plans.length > 0 && <LeaveNowBanner plans={plans} />}
      <div className="page">
        <div className="page-header">
          <span className="eyebrow">Your plan</span>
          <h1>Where to park, class by class</h1>
          <p className="lede">
            One recommendation per in-person class, ranked by walking distance and the odds a space
            is still free when you arrive.
          </p>
        </div>

        {error && (
          <div className="alert alert-error" role="alert">
            <strong>Couldn't build a plan.</strong> {error}
          </div>
        )}

        {!plans && !error && <Spinner label="Building your plan…" />}

        {plans && plans.length === 0 && (
          <div className="empty-state">
            <h2>Nothing to plan for</h2>
            <p className="muted">
              None of your classes are in person with a building we recognise.
            </p>
            <Link to="/upload" className="btn btn-ghost">
              Edit your schedule
            </Link>
          </div>
        )}

        {plans?.map((plan, i) => (
          <ClassPlanCard key={i} plan={plan} />
        ))}
      </div>
    </>
  );
}
