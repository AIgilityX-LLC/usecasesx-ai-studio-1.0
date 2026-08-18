import * as React from "react";
import { Text } from "@react-email/components";
import { AuthEmailLayout, codeBox, text } from "./auth-layout";

interface ReauthenticationEmailProps {
  token: string;
}

export const ReauthenticationEmail = ({ token }: ReauthenticationEmailProps) => (
  <AuthEmailLayout
    preview="Your UseCasesX verification code"
    heading="Your verification code"
    footerNote="This code expires shortly. Never share it with anyone."
  >
    <Text style={text}>Enter this code to confirm your identity:</Text>
    <Text style={codeBox}>{token}</Text>
  </AuthEmailLayout>
);

export default ReauthenticationEmail;
