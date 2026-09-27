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
    <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 14 }}>
      <thead>
        <tr style={{ textAlign: "left", borderBottom: "2px solid var(--border)" }}>
          <th style={{ padding: 8 }}>Course</th>
          <th style={{ padding: 8 }}>Days</th>
          <th style={{ padding: 8 }}>Time</th>
          <th style={{ padding: 8 }}>Building</th>
          <th style={{ padding: 8 }}>Status</th>
        </tr>
      </thead>
      <tbody>
        {classes.map((c, idx) => (
          <tr key={idx} style={{ borderBottom: "1px solid var(--border)" }}>
            <td style={{ padding: 8 }}>
              <input
                value={c.course}
                onChange={(e) => updateField(idx, "course", e.target.value)}
                style={{ width: 100 }}
              />
              <div style={{ fontSize: 12, color: "#6b7280" }}>{c.title}</div>
            </td>
            <td style={{ padding: 8 }}>
              {c.days.length ? c.days.map((d) => DAY_LABELS[d] ?? d).join("/") : "—"}
            </td>
            <td style={{ padding: 8 }}>{c.start && c.end ? `${c.start}–${c.end}` : "—"}</td>
            <td style={{ padding: 8 }}>
              {c.is_online ? (
                <em style={{ color: "#6b7280" }}>Online — no parking needed</em>
              ) : (
                <>
                  {c.building ?? <span style={{ color: "#b91c1c" }}>Unknown — can't plan parking</span>}
                  {c.building_source === "printed" && (
                    <span style={{ fontSize: 11, color: "#6b7280" }}> (from schedule)</span>
                  )}
                </>
              )}
            </td>
            <td style={{ padding: 8 }}>
              {c.is_online ? (
                <span style={{ color: "#9ca3af" }}>excluded</span>
              ) : c.building ? (
                <span style={{ color: "#16a34a" }}>ready</span>
              ) : (
                <span style={{ color: "#b91c1c" }}>needs building</span>
              )}
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
