import type { Metadata } from "next";
import { Contact, H2, LegalPage, P, UL } from "@/components/LegalPage";

export const metadata: Metadata = { title: "Community Guidelines" };

export default function GuidelinesPage() {
  return (
    <LegalPage title="Community Guidelines">
      <P>
        CityCircle works only if people can trust each other. These rules apply
        to everything you share on the platform: your profile, posts, comments
        and messages.
      </P>

      <H2>Be genuine</H2>
      <UL>
        <li>
          Use your real name and describe your work and experience honestly.
        </li>
        <li>Do not impersonate another person, company or organisation.</li>
        <li>
          Do not claim credentials, funding, titles or results you do not have.
        </li>
      </UL>

      <H2>Be respectful</H2>
      <UL>
        <li>No harassment, threats, hate speech or bullying.</li>
        <li>
          No discrimination based on gender, religion, caste, region, language,
          disability or similar.
        </li>
        <li>
          No sexual or explicit content, and no unwanted romantic advances.
        </li>
        <li>Disagree with ideas, not people.</li>
      </UL>

      <H2>Keep it useful and safe</H2>
      <UL>
        <li>No spam, repeated self-promotion or unsolicited mass messages.</li>
        <li>
          No scams, fake investment schemes or misleading offers. Never ask
          anyone for money to apply for a job, join a programme or get an
          introduction.
        </li>
        <li>
          Job posts must be real, with a real employer and honest details.
        </li>
        <li>No illegal content or activity, including pirated material.</li>
        <li>
          Do not share other people&apos;s private information, such as phone
          numbers or documents, without their consent.
        </li>
        <li>Do not scrape or copy member data to use elsewhere.</li>
      </UL>

      <H2>Respect each community</H2>
      <UL>
        <li>Stay on topic for the city and domain you are in.</li>
        <li>
          Promotion is welcome only where a community allows it, and must be
          clearly labelled.
        </li>
      </UL>

      <H2>Reporting and enforcement</H2>
      <P>
        You will be able to report content and accounts, and block people. Our
        team reviews reports and may remove content, warn, restrict or suspend
        accounts that break these rules. Serious or repeated breaches can lead
        to a permanent ban, and we may report illegal activity to the
        authorities. If you think we made a mistake, you can ask us to review
        the decision.
      </P>

      <H2>Contact</H2>
      <Contact />
    </LegalPage>
  );
}
