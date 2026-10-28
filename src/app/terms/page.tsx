import type { Metadata } from "next";
import Link from "next/link";
import { Contact, H2, LegalPage, P, UL } from "@/components/LegalPage";

export const metadata: Metadata = { title: "Terms of Use" };

export default function TermsPage() {
  return (
    <LegalPage title="Terms of Use">
      <P>
        These terms are an agreement between you and CityCircle. By creating an account or using the
        service you accept them, together with our{" "}
        <Link href="/privacy/" className="font-medium text-primary underline">
          Privacy Policy
        </Link>{" "}
        and{" "}
        <Link href="/guidelines/" className="font-medium text-primary underline">
          Community Guidelines
        </Link>
        . If you do not agree, please do not use CityCircle.
      </P>

      <H2>1. What CityCircle is</H2>
      <P>
        CityCircle is a city-first professional network. It offers communities for each city and
        domain, member profiles, and over time posts, connections, messaging and other features. Some
        features are still being built and may change.
      </P>

      <H2>2. Who can use it</H2>
      <UL>
        <li>You must be 18 or older and legally able to enter this agreement.</li>
        <li>You must give accurate information and keep it up to date.</li>
        <li>One person, one account. Do not create accounts for others without permission.</li>
      </UL>

      <H2>3. Your account</H2>
      <P>
        Keep your password private. You are responsible for activity on your account. Tell us
        immediately if you think someone else has accessed it.
      </P>

      <H2>4. Communities</H2>
      <P>
        Communities are created and managed by the CityCircle team. Joining a waitlist does not
        guarantee that a community will open, or when. We may open, merge, rename, pause or close
        communities, and set limits on membership.
      </P>

      <H2>5. Your content</H2>
      <UL>
        <li>
          You own what you post. You give CityCircle a non-exclusive, worldwide licence to host,
          display and distribute it as needed to run the service, and only for as long as it is on the
          service.
        </li>
        <li>You are responsible for your content and must have the right to share it.</li>
        <li>
          We may remove content that breaks these terms or the Community Guidelines, or that we are
          legally required to remove.
        </li>
      </UL>

      <H2>6. Acceptable use</H2>
      <P>You agree not to:</P>
      <UL>
        <li>break the law, these terms, or the Community Guidelines;</li>
        <li>impersonate others or give false information;</li>
        <li>send spam, run scams, or post misleading job, investment or business offers;</li>
        <li>harvest, scrape or export member data, or use it to contact people in bulk, without our written permission;</li>
        <li>try to access other people&apos;s data, break security, or interfere with the service;</li>
        <li>use bots or automated tools on the service without our written permission.</li>
      </UL>

      <H2>7. Paid features</H2>
      <P>
        CityCircle is free for members today. We may later offer paid features such as recruiter
        tools, advertising or creator campaigns. Their prices and terms will be shown clearly before
        you buy, and will not change what you already use for free without notice.
      </P>

      <H2>8. Dealings with other members</H2>
      <P>
        CityCircle helps people find each other. We do not guarantee jobs, leads, investment, business
        results, or the accuracy of what members say. We are not a party to agreements between members.
        Be careful, verify claims, and never send money to someone you have not verified.
      </P>

      <H2>9. Suspension and ending</H2>
      <P>
        You can stop using CityCircle and ask us to delete your account at any time. We may limit,
        suspend or end an account that breaks these terms or the Community Guidelines, or that puts
        others or the service at risk. Where reasonable, we will tell you why.
      </P>

      <H2>10. Service as is</H2>
      <P>
        CityCircle is in early development and is provided as is. We try to keep it available and
        accurate but cannot promise it will be uninterrupted or error-free. To the extent the law
        allows, CityCircle is not liable for indirect or consequential loss, and our total liability to
        you is limited to the amount you have paid us in the previous 12 months (or INR 1,000 if you
        have paid nothing). Nothing here limits rights you have under law that cannot be excluded.
      </P>

      <H2>11. Changes</H2>
      <P>
        We may update these terms. If a change is significant we will tell you, for example by email or
        a notice in the app. Continuing to use the service after that means you accept the update.
      </P>

      <H2>12. Governing law</H2>
      <P>
        These terms are governed by the laws of India. Courts in India will have jurisdiction, and we
        will name the specific city once the company details are final.
      </P>

      <H2>13. Contact</H2>
      <Contact />
    </LegalPage>
  );
}
