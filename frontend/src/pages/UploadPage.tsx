import { useState, type ChangeEvent, type DragEvent } from "react";
import { useNavigate } from "react-router-dom";
import { ingestSchedule, type ParsedClass } from "../lib/api";
import TimetableTable from "../components/TimetableTable";
import Spinner from "../components/Spinner";

export default function UploadPage() {
  const [classes, setClasses] = useState<ParsedClass[] | null>(null);
  const [busy, setBusy] = useState(false);
  const [dragging, setDragging] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();

  // Shared by the file picker and drag-and-drop so both paths behave identically.
  async function processFile(file: File) {
    const isPdf = file.type === "application/pdf" || file.name.toLowerCase().endsWith(".pdf");
    if (!isPdf && !file.type.startsWith("image/")) {
      setClasses(null);
      setError(
        `"${file.name}" isn't a PDF or an image. Upload your FIU "Schedule of Classes" PDF, or a screenshot of it.`,
      );
      return;
    }

    setBusy(true);
    setError(null);
    setClasses(null); // don't leave a previous file's table on screen next to a new error
    try {
      const result = await ingestSchedule(file);
      if (result.classes.length === 0) {
        setError(
          `No classes found. Use the PDF export from FIU's "Schedule of Classes" page, or a clear screenshot of it.`,
        );
      } else {
        setClasses(result.classes);
      }
    } catch (err) {
      setError(
        err instanceof TypeError
          ? "We couldn't reach the PantherPark server. Make sure the backend is running (uvicorn on port 8000)."
          : err instanceof Error
            ? err.message
            : String(err),
      );
    } finally {
      setBusy(false);
    }
  }

  function handleFile(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    // Browsers only fire `change` when the value differs, so without this,
    // re-choosing the same file after a failure silently does nothing.
    e.target.value = "";
    if (file) void processFile(file);
  }

  function handleDragOver(e: DragEvent<HTMLLabelElement>) {
    // Must preventDefault or the browser refuses the drop and instead opens
    // the dropped PDF in this tab, navigating away from the app.
    e.preventDefault();
    e.dataTransfer.dropEffect = "copy";
    if (!busy) setDragging(true);
  }

  function handleDrop(e: DragEvent<HTMLLabelElement>) {
    e.preventDefault();
    setDragging(false);
    if (busy) return;
    const file = e.dataTransfer.files?.[0];
    if (file) void processFile(file);
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

      <label
        className={dragging ? "dropzone is-dragging" : "dropzone"}
        onDragOver={handleDragOver}
        onDragLeave={() => setDragging(false)}
        onDrop={handleDrop}
      >
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
