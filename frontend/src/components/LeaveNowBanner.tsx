import type { ClassPlan } from "../lib/api";

const STATUS_STYLE: Record<string, { bg: string; fg: string; label: (p: ClassPlan) => string }> = {
  leave_now: {
    bg: "#fee2e2",
    fg: "#991b1b",
    label: (p) => `Leave now for ${p.course}!`,
  },
  leave_soon: {
    bg: "#fef3c7",
    fg: "#92400e",
    label: (p) =>
      `Leave by ${new Date(p.leave_now.leave_by).toLocaleTimeString(undefined, {
        hour: "numeric",
        minute: "2-digit",
      })} for ${p.course}`,
  },
  plenty_of_time: {
    bg: "#dcfce7",
    fg: "#166534",
    label: (p) =>
      `Leave by ${new Date(p.leave_now.leave_by).toLocaleTimeString(undefined, {
        hour: "numeric",
        minute: "2-digit",
      })} for ${p.course}`,
  },
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

  const style = STATUS_STYLE[plan.leave_now.status];

  return (
    <div
      style={{
        position: "sticky",
        top: 0,
        zIndex: 500,
        background: style.bg,
        color: style.fg,
        padding: "10px 16px",
        fontWeight: 700,
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
      }}
    >
      <span>{style.label(plan)}</span>
      <span style={{ fontWeight: 400, fontSize: 13 }}>
        → {plan.recommended.full_name ?? plan.recommended.name}
        {plan.leave_now.is_filling_fast && " · filling up fast"}
      </span>
    </div>
  );
}
