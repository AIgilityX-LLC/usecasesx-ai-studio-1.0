import * as React from "react";
import { Link, Text } from "@react-email/components";
import { AuthEmailLayout, link, text } from "./auth-layout";

interface InviteEmailProps {
  siteName: string;
  siteUrl: string;
  confirmationUrl: string;
}

export const InviteEmail = ({ siteName, siteUrl, confirmationUrl }: InviteEmailProps) => (
  <AuthEmailLayout
    preview={`You've been invited to ${siteName}`}
    heading="You've been invited"
    ctaLabel="Accept invitation"
    ctaUrl={confirmationUrl}
    footerNote="Pro Founding Access is complimentary through 31 December 2026."
  >
    <Text style={text}>
      You have been invited to join{" "}
      <Link href={siteUrl} style={link}>
        <strong>{siteName}</strong>
      </Link>{" "}
      — discover, design, prioritize and manage AI use cases with evidence.
    </Text>
  </AuthEmailLayout>
);

export default InviteEmail;
