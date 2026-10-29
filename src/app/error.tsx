"use client";

export default function ErrorPage({
  reset,
}: {
  error: Error;
  reset: () => void;
}) {
  return (
    <div className="space-y-4">
      <h1 className="text-3xl font-semibold">Something went wrong</h1>
      <p className="text-muted">Please try again.</p>
      <button
        type="button"
        onClick={reset}
        className="rounded-lg bg-accent px-4 py-2 font-medium text-accent-fg"
      >
        Try again
      </button>
    </div>
  );
}
