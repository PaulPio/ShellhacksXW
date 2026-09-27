import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ingestSchedule, type ParsedClass } from "../lib/api";
import TimetableTable from "../components/TimetableTable";

export default function UploadPage() {
  const [classes, setClasses] = useState<ParsedClass[] | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setBusy(true);
    setError(null);
    try {
      const result = await ingestSchedule(file);
      setClasses(result.classes);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setBusy(false);
    }
  }

  function handleConfirm() {
    if (!classes) return;
    sessionStorage.setItem("pantherpark_classes", JSON.stringify(classes));
    navigate("/plan");
  }

  return (
    <div style={{ maxWidth: 720, margin: "32px auto", padding: 16 }}>
      <h2>Upload your schedule</h2>
      <p style={{ fontSize: 13, color: "#6b7280" }}>
        PDF (FIU "Schedule of Classes" export) or a screenshot. Your file is parsed in memory
        and discarded immediately — never stored.
      </p>

      <input type="file" accept=".pdf,image/*" onChange={handleFile} disabled={busy} />
      {busy && <p>Parsing…</p>}
      {error && <p style={{ color: "#b91c1c" }}>{error}</p>}

      {classes && (
        <div style={{ marginTop: 24 }}>
          <TimetableTable classes={classes} onChange={setClasses} />
          <button onClick={handleConfirm} style={{ marginTop: 16, padding: "8px 16px", fontWeight: 600 }}>
            Confirm schedule →
          </button>
        </div>
      )}
    </div>
  );
}
