/**
 * AxioGlobe — the AxioVital globe mark, matching the Provider Operating
 * Environment identity (globe + wordmark). Inherits text color.
 */
export function AxioGlobe({ className = "h-8 w-8" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.6}
      strokeLinecap="round"
      className={className}
      aria-hidden="true"
    >
      <circle cx="12" cy="12" r="9" />
      <ellipse cx="12" cy="12" rx="4.2" ry="9" />
      <path d="M3.2 9.2h17.6M3.2 14.8h17.6" />
    </svg>
  );
}
