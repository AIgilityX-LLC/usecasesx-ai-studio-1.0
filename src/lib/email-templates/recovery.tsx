import * as React from "react";
import { Text } from "@react-email/components";
import { AuthEmailLayout, text } from "./auth-layout";

interface RecoveryEmailProps {
  siteName: string;
  confirmationUrl: string;
}

export const RecoveryEmail = ({ siteName, confirmationUrl }: RecoveryEmailProps) => (
  <AuthEmailLayout
    preview={`Reset your password for ${siteName}`}
    heading="Reset your password"
    ctaLabel="Set a new password"
    ctaUrl={confirmationUrl}
    footerNote="If you did not request a reset, your password remains unchanged."
  >
    <Text style={text}>
      We received a request to reset the password for your {siteName} account. Choose a new password
      using the button below.
    </Text>
  </AuthEmailLayout>
);

export default RecoveryEmail;
