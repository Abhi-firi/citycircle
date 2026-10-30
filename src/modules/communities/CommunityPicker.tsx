"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight } from "lucide-react";
import { communityRepository as repo } from "./repository";

const selectClass =
  "w-full rounded-lg border border-line bg-surface px-3 py-2.5 text-fg outline-none focus:border-primary";

/** Pick a city and a domain, then go straight to that community. */
export function CommunityPicker() {
  const router = useRouter();
  const [city, setCity] = useState("");
  const [domain, setDomain] = useState("");
  const [hint, setHint] = useState(false);
  const cities = repo.listCities();
  const domains = repo.listDomains();

  function go(e: React.FormEvent) {
    e.preventDefault();
    if (!city || !domain) return setHint(true);
    router.push(`/cities/${city}/${domain}/`);
  }

  return (
    <form
      onSubmit={go}
      className="space-y-3 rounded-xl bg-surface p-4 text-fg shadow-lg sm:p-5"
    >
      <p className="font-medium">Find your community</p>
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="space-y-1 text-sm">
          <span className="text-muted">City</span>
          <select
            value={city}
            onChange={(e) => setCity(e.target.value)}
            className={selectClass}
          >
            <option value="">Select city</option>
            {cities.map((c) => (
              <option key={c.slug} value={c.slug}>
                {c.name}
              </option>
            ))}
          </select>
        </label>
        <label className="space-y-1 text-sm">
          <span className="text-muted">Domain</span>
          <select
            value={domain}
            onChange={(e) => setDomain(e.target.value)}
            className={selectClass}
          >
            <option value="">Select domain</option>
            {domains.map((d) => (
              <option key={d.slug} value={d.slug}>
                {d.name}
              </option>
            ))}
          </select>
        </label>
      </div>
      {hint && (!city || !domain) && (
        <p role="alert" className="text-sm text-red-600">
          Choose a city and a domain.
        </p>
      )}
      <button
        type="submit"
        className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-primary px-5 py-3 font-medium text-on-primary hover:opacity-90"
      >
        Find community
        <ArrowRight aria-hidden="true" className="h-4 w-4" />
      </button>
    </form>
  );
}
