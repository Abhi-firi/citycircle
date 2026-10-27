import type { Metadata } from "next";
import { Contact, H2, LegalPage, P, UL } from "@/components/LegalPage";

export const metadata: Metadata = { title: "Community Guidelines" };

export default function GuidelinesPage() {
  return (
    <LegalPage title="Community Guidelines">
      <P>
        CityCircle works only if people can trust each other. These rules apply to everything you
        share on the platform.
      </P>

      <H2>Be genuine</H2>
      <UL>
        <li>Use your real name and describe your work honestly.</li>
        <li>Do not impersonate another person, company or organisation.</li>
      </UL>

      <H2>Be respectful</H2>
      <UL>
        <li>No harassment, threats, hate or bullying.</li>
        <li>No discrimination based on gender, religion, caste, region, disability or similar.</li>
      </UL>

      <H2>Keep it useful and safe</H2>
      <UL>
        <li>No spam, repeated promotion or unsolicited mass messages.</li>
        <li>No scams, fake investment schemes or misleading job offers. Never ask people for money to apply for a job.</li>
        <li>No illegal content or activity.</li>
        <li>Do not share other people&apos;s private information without their consent.</li>
      </UL>

      <H2>Reporting and enforcement</H2>
      <P>
        You will be able to report content and accounts. Our team may remove content, warn, restrict or
        suspend accounts that break these rules. If you think we made a mistake, you can ask us to
        review the decision.
      </P>

      <H2>Contact</H2>
      <Contact />
    </LegalPage>
  );
}
