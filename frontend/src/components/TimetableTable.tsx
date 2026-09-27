import type { ParsedClass } from "../lib/api";

interface Props {
  classes: ParsedClass[];
  onChange: (classes: ParsedClass[]) => void;
}

const DAY_LABELS: Record<string, string> = { M: "Mon", T: "Tue", W: "Wed", Th: "Thu", F: "Fri" };

export default function TimetableTable({ classes, onChange }: Props) {
  function updateField(idx: number, field: keyof ParsedClass, value: string) {
    const next = classes.map((c, i) => (i === idx ? { ...c, [field]: value } : c));
    onChange(next);
  }

  return (
    <div className="timetable-wrap">
      <table className="timetable">
        <thead>
          <tr>
            <th scope="col">Course</th>
            <th scope="col">Days</th>
            <th scope="col">Time</th>
            <th scope="col">Building</th>
            <th scope="col">Status</th>
          </tr>
        </thead>
        <tbody>
          {classes.map((c, idx) => (
            <tr key={idx}>
              <td>
                <input
                  type="text"
                  className="timetable-course-input"
                  aria-label={`Course code for row ${idx + 1}`}
                  value={c.course}
                  onChange={(e) => updateField(idx, "course", e.target.value)}
                />
                {c.title && <div className="timetable-course-title">{c.title}</div>}
              </td>
              <td>{c.days.length ? c.days.map((d) => DAY_LABELS[d] ?? d).join(" / ") : "—"}</td>
              <td>{c.start && c.end ? `${c.start}–${c.end}` : "—"}</td>
              <td>
                {c.is_online ? (
                  <span className="muted">Online — no parking needed</span>
                ) : (
                  <>
                    {c.building ?? <span className="muted">Not printed on your schedule</span>}
                    {c.building_source === "printed" && (
                      <div className="timetable-course-title">from your schedule</div>
                    )}
                  </>
                )}
              </td>
              <td>
                {c.is_online ? (
                  <span className="badge badge-simulated">Excluded</span>
                ) : c.building ? (
                  <span className="badge badge-live">Ready</span>
                ) : (
                  <span className="badge badge-busy">Needs building</span>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
