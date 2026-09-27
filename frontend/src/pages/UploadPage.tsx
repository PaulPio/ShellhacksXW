import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ingestSchedule, type ParsedClass } from "../lib/api";
import TimetableTable from "../components/TimetableTable";
import Spinner from "../components/Spinner";

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
    <div className="page">
      <h2>Upload your schedule</h2>
      <p className="page-intro">
        PDF (FIU "Schedule of Classes" export) or a screenshot. Your file is parsed in memory
        and discarded immediately — never stored.
      </p>

      <div style={{ textAlign: "center" }}>
        <input type="file" accept=".pdf,image/*" onChange={handleFile} disabled={busy} />
      </div>
      {busy && (
        <p style={{ textAlign: "center", marginTop: 12 }}>
          <Spinner label="Parsing your schedule…" />
        </p>
      )}
      {error && (
        <p style={{ color: "#b91c1c", textAlign: "center", marginTop: 12 }}>
          Couldn't parse that file: {error}
        </p>
      )}

      {classes && (
        <div style={{ marginTop: 24 }}>
          <TimetableTable classes={classes} onChange={setClasses} />
          <div style={{ textAlign: "center" }}>
            <button onClick={handleConfirm} style={{ marginTop: 16, padding: "8px 16px", fontWeight: 600 }}>
              Confirm schedule →
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
