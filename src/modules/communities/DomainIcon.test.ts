import { describe, expect, it } from "vitest";
import { hasDomainIcon } from "./DomainIcon";
import { DOMAINS } from "./seed";

describe("domain icons", () => {
  it("has an icon for every domain", () => {
    const missing = DOMAINS.filter((d) => !hasDomainIcon(d.slug)).map(
      (d) => d.slug,
    );
    expect(missing).toEqual([]);
  });
});
