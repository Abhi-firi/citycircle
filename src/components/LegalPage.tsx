import { SITE } from "@/config/site";

export function LegalPage({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <article className="max-w-2xl space-y-6">
      <header className="space-y-3">
        <h1 className="text-3xl font-semibold">{title}</h1>
        <p className="text-sm text-muted">
          Last updated {SITE.legalLastUpdated}
        </p>
        <p
          role="note"
          className="rounded-lg border border-line bg-pale px-4 py-3 text-sm text-fg"
        >
          <strong>Pre-launch version.</strong> CityCircle is still being built.
          This text will be reviewed by a lawyer and updated before public
          launch.
        </p>
      </header>
      {children}
    </article>
  );
}

export function H2({ children }: { children: React.ReactNode }) {
  return <h2 className="pt-2 text-xl font-semibold">{children}</h2>;
}

export function P({ children }: { children: React.ReactNode }) {
  return <p className="leading-relaxed text-fg">{children}</p>;
}

export function UL({ children }: { children: React.ReactNode }) {
  return (
    <ul className="list-disc space-y-1 pl-5 leading-relaxed text-fg">
      {children}
    </ul>
  );
}

export function Contact() {
  return SITE.supportEmail ? (
    <P>
      Contact us at{" "}
      <a
        href={`mailto:${SITE.supportEmail}`}
        className="font-medium text-primary underline"
      >
        {SITE.supportEmail}
      </a>
      .
    </P>
  ) : (
    <P>Contact details will be added here before public launch.</P>
  );
}
