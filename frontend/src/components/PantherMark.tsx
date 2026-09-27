/**
 * The PantherPark mark: a map pin whose counter is a parking "P", in FIU Blue
 * with a gold underscore. Drawn rather than imported so it inherits sizing
 * from CSS and stays crisp at nav and favicon scales.
 */
export default function PantherMark({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 32 32"
      role="img"
      aria-label="PantherPark"
      focusable="false"
    >
      <path
        d="M16 2c-5.7 0-10.3 4.5-10.3 10.1C5.7 19.8 16 30 16 30s10.3-10.2 10.3-17.9C26.3 6.5 21.7 2 16 2Z"
        className="mark-body"
      />
      <path
        d="M12.6 19.4V7.9h4.7c2.6 0 4.3 1.6 4.3 4s-1.7 4.1-4.3 4.1h-2v3.4h-2.7Zm2.7-5.7h1.6c1.1 0 1.8-.6 1.8-1.7s-.7-1.7-1.8-1.7h-1.6v3.4Z"
        className="mark-letter"
      />
      <rect x="12.6" y="21" width="9" height="2.1" rx="0.4" className="mark-bar" />
    </svg>
  );
}
