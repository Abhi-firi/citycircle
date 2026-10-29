import type { Metadata } from "next";
import { Contact, H2, LegalPage, P, UL } from "@/components/LegalPage";

export const metadata: Metadata = { title: "Privacy Policy" };

export default function PrivacyPage() {
  return (
    <LegalPage title="Privacy Policy">
      <P>
        This policy explains what personal data CityCircle collects, why, who
        sees it, and the choices you have. It is written to follow India&apos;s
        Digital Personal Data Protection Act, 2023. We aim to collect only what
        we need.
      </P>

      <H2>1. What we collect</H2>
      <UL>
        <li>
          <strong>Account details:</strong> your email address and password.
          Your password is handled by our sign-in provider and we never see it
          in plain text.
        </li>
        <li>
          <strong>Profile details you give us:</strong> your name, city, the
          domains you are interested in, and, as you choose to add them, your
          headline, role, company and other professional details.
        </li>
        <li>
          <strong>Activity:</strong> the communities you join, and, once those
          features launch, your posts, comments, connections and messages.
        </li>
        <li>
          <strong>Technical data:</strong> basic logs such as IP address, device
          and browser type, kept by our providers for security and to fix
          errors.
        </li>
      </UL>

      <H2>2. Why we use it</H2>
      <UL>
        <li>To create and secure your account.</li>
        <li>
          To show your profile and run community waitlists and communities.
        </li>
        <li>
          To contact you about your account, or when a community you joined
          opens.
        </li>
        <li>
          To prevent spam, abuse and fraud, and to keep the service working and
          improve it.
        </li>
        <li>To meet legal obligations.</li>
      </UL>
      <P>
        We process your data based on your consent, given when you sign up, and
        where the law allows for legitimate uses such as security. We do not
        sell your personal data, and we do not show advertising at this time.
      </P>

      <H2>3. Who can see your information</H2>
      <UL>
        <li>
          Your name, headline, city, role, company, about text, skills, years of
          experience and the domains you are interested in are visible to other
          logged-in CityCircle members. They are not visible to people who are
          not signed in.
        </li>
        <li>
          Your posts and comments are visible to the members of the community
          they were posted in.
        </li>
        <li>
          Your connections and connection requests are visible only to you and
          the other person.
        </li>
        <li>
          Other members see only the number of people on each waitlist, never
          who they are.
        </li>
        <li>
          Private job preferences, such as expected pay and notice period, stay
          visible only to you unless you choose to share them with a recruiter
          in future.
        </li>
        <li>
          We use your city and communities to suggest people you may know.
          Suggestions show only the profile details listed above.
        </li>
      </UL>

      <H2>4. Service providers and transfers</H2>
      <P>
        We use trusted providers to run the service: Supabase for our database
        and sign-in (data is stored in the Singapore region) and GitHub to host
        the website. They process data on our behalf under their own security
        commitments. Your data may therefore be stored or processed outside
        India. We will tell you if we add a provider that handles your personal
        data in a significant new way.
      </P>

      <H2>5. How long we keep it</H2>
      <P>
        We keep your data while your account is active. If you delete your
        account, we delete your profile and memberships, except where we must
        keep something to meet a legal obligation or resolve a dispute. Routine
        backups are removed on their normal cycle.
      </P>

      <H2>6. Your rights</H2>
      <P>You may ask us to:</P>
      <UL>
        <li>show you the personal data we hold about you;</li>
        <li>correct or complete it;</li>
        <li>delete it, or delete your account;</li>
        <li>
          withdraw your consent (this may mean we can no longer provide the
          service);
        </li>
        <li>
          nominate someone to exercise these rights for you if you die or cannot
          act.
        </li>
      </UL>
      <P>
        Write to the contact below and we will respond within a reasonable time.
        Until in-app controls are available, we handle these requests by email.
      </P>

      <H2>7. Grievances</H2>
      <P>
        If you have a complaint about how we handle your data, contact us first
        at the address below and we will try to resolve it promptly. If you are
        not satisfied, you may complain to the Data Protection Board of India. A
        named grievance officer will be listed here before public launch.
      </P>

      <H2>8. Security</H2>
      <P>
        We use reasonable safeguards, including access rules in our database so
        members can reach only their own data, and encrypted connections. No
        system is completely secure, so we cannot guarantee absolute security.
        If a breach affects your data, we will tell you and the authorities as
        the law requires.
      </P>

      <H2>9. Age</H2>
      <P>
        CityCircle is for people aged 18 and over. If we learn that someone
        younger has an account, we will delete it.
      </P>

      <H2>10. Cookies and local storage</H2>
      <P>
        We use only what is needed to keep you signed in. We do not use
        advertising or cross-site tracking cookies.
      </P>

      <H2>11. Changes to this policy</H2>
      <P>
        We will post changes on this page and update the date above. For
        significant changes we will also notify you.
      </P>

      <H2>12. Contact</H2>
      <Contact />
    </LegalPage>
  );
}
