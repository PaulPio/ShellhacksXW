import type { ClassPlan } from "../lib/api";

function leaveByLabel(plan: ClassPlan): string {
  return new Date(plan.leave_now.leave_by).toLocaleTimeString(undefined, {
    hour: "numeric",
    minute: "2-digit",
  });
}

const STATUS_LABEL: Record<string, (p: ClassPlan) => string> = {
  leave_now: (p) => `Leave now for ${p.course}`,
  leave_soon: (p) => `Leave by ${leaveByLabel(p)} for ${p.course}`,
  plenty_of_time: (p) => `Leave by ${leaveByLabel(p)} for ${p.course}`,
};

/** Picks whichever plan's leave-by time is soonest -- that's "the next class." */
function nextUpPlan(plans: ClassPlan[]): ClassPlan | null {
  if (plans.length === 0) return null;
  return [...plans].sort(
    (a, b) => new Date(a.leave_now.leave_by).getTime() - new Date(b.leave_now.leave_by).getTime()
  )[0];
}

export default function LeaveNowBanner({ plans }: { plans: ClassPlan[] }) {
  const plan = nextUpPlan(plans);
  if (!plan) return null;

  const status = plan.leave_now.status;
  const label = STATUS_LABEL[status];
  if (!label) return null;

  return (
    <div className={`leave-banner leave-banner-${status}`} role="status">
      <span className="leave-banner-headline">
        <span className="leave-banner-dot" aria-hidden="true" />
        {label(plan)}
      </span>
      <span className="leave-banner-detail">
        Head for {plan.recommended.full_name ?? plan.recommended.name}
        {plan.leave_now.is_filling_fast && " — filling up fast"}
      </span>
    </div>
  );
}
