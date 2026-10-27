import Link from "next/link";

export default function NotFound() {
  return (
    <div className="space-y-4">
      <h1 className="text-3xl font-semibold">Page not found</h1>
      <p className="text-muted">We could not find that page.</p>
      <Link href="/" className="text-accent underline">
        Back to home
      </Link>
    </div>
  );
}
