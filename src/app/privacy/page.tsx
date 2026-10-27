import type { Metadata } from "next";
import { Contact, H2, LegalPage, P, UL } from "@/components/LegalPage";

export const metadata: Metadata = { title: "Privacy Policy" };

export default function PrivacyPage() {
  return (
    <LegalPage title="Privacy Policy">
      <P>
        This policy explains what personal information CityCircle collects, why, and the choices you
        have. We aim to collect only what we need.
      </P>

      <H2>1. What we collect</H2>
      <UL>
        <li>
          <strong>Account details:</strong> your email address and password. Your password is handled
          by our sign-in provider; we never see it in plain text.
        </li>
        <li>
          <strong>Profile details you give us:</strong> your name, city, the domains you are interested
          in, and optionally your current role, company and headline.
        </li>
        <li>
          <strong>Activity:</strong> the community waitlists you join.
        </li>
        <li>
          <strong>Technical data:</strong> basic logs such as IP address and browser type, kept by our
          service providers for security and to fix errors.
        </li>
      </UL>

      <H2>2. Why we use it</H2>
      <UL>
        <li>To create and secure your account.</li>
        <li>To show your profile and run community waitlists.</li>
        <li>To contact you about your account or when a community you joined opens.</li>
        <li>To prevent spam, abuse and fraud, and to keep the service working.</li>
      </UL>
      <P>We do not sell your personal information, and we do not show advertising at this time.</P>

      <H2>3. Who can see your information</H2>
      <P>
        Right now your profile is visible only to you. Other members can see only the number of people
        on each waitlist, never who they are. Before we make profiles visible to others, we will update
        this policy and give you controls over what is shown.
      </P>

      <H2>4. Service providers</H2>
      <P>
        We use trusted providers to run the service: Supabase for our database and sign-in (data is
        stored in the Singapore region), and GitHub to host the website. These providers process data
        on our behalf and your information may therefore be stored or processed outside India.
      </P>

      <H2>5. How long we keep it</H2>
      <P>
        We keep your information while your account is active. If you ask us to delete your account, we
        will delete your profile and waitlist memberships, except where we must keep something to meet
        a legal obligation. Until in-app deletion is available, send your request using the contact
        details below.
      </P>

      <H2>6. Your rights</H2>
      <P>
        You may ask to access, correct or delete your personal information, withdraw your consent, or
        raise a complaint. Use the contact details below and we will respond within a reasonable time.
      </P>

      <H2>7. Security</H2>
      <P>
        We use reasonable safeguards, including access rules in our database so members can only reach
        their own data. No system is completely secure, so we cannot guarantee absolute security.
      </P>

      <H2>8. Age</H2>
      <P>CityCircle is for people aged 18 and over.</P>

      <H2>9. Changes to this policy</H2>
      <P>We will post any changes on this page and update the date above.</P>

      <H2>10. Contact</H2>
      <Contact />
    </LegalPage>
  );
}
