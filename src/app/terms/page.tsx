import type { Metadata } from "next";
import Link from "next/link";
import { Contact, H2, LegalPage, P, UL } from "@/components/LegalPage";

export const metadata: Metadata = { title: "Terms of Use" };

export default function TermsPage() {
  return (
    <LegalPage title="Terms of Use">
      <P>
        These terms apply when you use CityCircle. By creating an account you agree to them and to our{" "}
        <Link href="/privacy/" className="font-medium text-primary underline">
          Privacy Policy
        </Link>{" "}
        and{" "}
        <Link href="/guidelines/" className="font-medium text-primary underline">
          Community Guidelines
        </Link>
        .
      </P>

      <H2>1. Who can use CityCircle</H2>
      <P>You must be 18 or older and able to enter a binding agreement. You must give accurate information.</P>

      <H2>2. Your account</H2>
      <P>
        Keep your password private. You are responsible for activity on your account. Tell us if you
        think someone else has accessed it.
      </P>

      <H2>3. Communities</H2>
      <P>
        Communities are created and managed by the CityCircle team. Joining a waitlist does not
        guarantee that a community will open, or when. We may open, merge, pause or close communities.
      </P>

      <H2>4. Acceptable use</H2>
      <P>You agree not to:</P>
      <UL>
        <li>break the law or these terms, or the Community Guidelines;</li>
        <li>impersonate others or give false information;</li>
        <li>send spam, run scams or post misleading job or business offers;</li>
        <li>try to access other people&apos;s data or interfere with the service;</li>
        <li>use bots or scrape the service without our written permission.</li>
      </UL>

      <H2>5. No guarantees about outcomes</H2>
      <P>
        CityCircle helps people find communities. We do not guarantee jobs, leads, investment, business
        results, or the accuracy of what members say. You are responsible for your own decisions when
        dealing with other people.
      </P>

      <H2>6. Suspension and ending</H2>
      <P>
        You can stop using CityCircle at any time. We may limit or end an account that breaks these
        terms or the Community Guidelines, or that puts others or the service at risk.
      </P>

      <H2>7. Service &quot;as is&quot;</H2>
      <P>
        CityCircle is in early development and is provided as is. We try to keep it available and
        accurate but cannot promise it will always be uninterrupted or error-free. To the extent the law
        allows, our liability is limited.
      </P>

      <H2>8. Changes</H2>
      <P>We may update these terms. If a change is significant we will tell you. Continuing to use the service means you accept the update.</P>

      <H2>9. Governing law</H2>
      <P>These terms are governed by the laws of India. The courts and place of jurisdiction will be confirmed before public launch.</P>

      <H2>10. Contact</H2>
      <Contact />
    </LegalPage>
  );
}
