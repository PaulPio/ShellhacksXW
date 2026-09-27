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
      <div className="page-header">
        <span className="eyebrow">Step 01</span>
        <h1>Upload your schedule</h1>
        <p className="lede">
          Your FIU "Schedule of Classes" PDF export, or a screenshot of it. We read the course
          codes, meeting times and buildings, then you get a chance to correct them.
        </p>
      </div>

      <label className="dropzone">
        <span className="dropzone-title">Choose a PDF or screenshot</span>
        <span className="muted">or drag one onto this area</span>
        <input type="file" accept=".pdf,image/*" onChange={handleFile} disabled={busy} />
      </label>

      <p className="privacy-note">
        Your file is parsed in memory and discarded immediately. It is never written to disk and
        never stored in our database — there is no column for it.
      </p>

      {busy && <Spinner label="Parsing your schedule…" />}

      {error && (
        <div className="alert alert-error" role="alert">
          <strong>Couldn't parse that file.</strong> {error}
        </div>
      )}

      {classes && (
        <div style={{ marginTop: 32 }}>
          <span className="eyebrow">Step 02</span>
          <h2 className="section-title">Check what we read</h2>
          <p className="muted" style={{ margin: "20px 0 16px" }}>
            Edit any course code that came through wrong. Rows without a building can't be planned
            for — FIU's class search API has no room field, so we only know what your schedule
            printed.
          </p>
          <TimetableTable classes={classes} onChange={setClasses} />
          <button onClick={handleConfirm} className="btn btn-primary" style={{ marginTop: 20 }}>
            Build my parking plan
          </button>
        </div>
      )}
    </div>
  );
}
