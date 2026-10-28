/** Temporary wordmark: ring mark plus name in Deep Teal. Replace with the final logo when ready. */
export function Logo() {
  return (
    <span className="inline-flex items-center gap-2 text-deep">
      <svg
        width="28"
        height="28"
        viewBox="0 0 28 28"
        fill="none"
        aria-hidden="true"
      >
        <circle cx="14" cy="14" r="11" stroke="currentColor" strokeWidth="3" />
        <circle cx="14" cy="14" r="4" fill="currentColor" />
      </svg>
      <span className="text-xl font-semibold tracking-tight">CityCircle</span>
    </span>
  );
}
