export default function Spinner({ label }: { label?: string }) {
  return (
    <span className="loading-row" role="status">
      <span className="spinner" aria-hidden="true" />
      {label ?? "Loading…"}
    </span>
  );
}
