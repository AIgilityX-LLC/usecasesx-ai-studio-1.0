import React from "react";
import {
  Body,
  Container,
  Head,
  Heading,
  Hr,
  Html,
  Link,
  Preview,
  Section,
  Text,
} from "@react-email/components";
import type { TemplateEntry } from "./registry";

interface Props {
  name?: string;
  organization?: string | null;
  inviteUrl?: string;
  appUrl?: string | null;
}

const Email = ({ name, organization, inviteUrl, appUrl }: Props) => {
  const base = appUrl || "https://usecasesx.aigilityx.com";
  return (
    <Html lang="en" dir="ltr">
      <Head />
      <Preview>Your UseCasesX Pro Founding Access invitation</Preview>
      <Body style={main}>
        <Container style={container}>
          <Text style={brand}>UseCasesX™ by AIgilityX™</Text>
          <Heading style={heading}>You&apos;re invited — Pro Founding Access</Heading>
          <Text style={text}>
            {name ? `Hello ${name},` : "Hello,"} your request for Early Gratis (Pro) Access has been
            approved. Pro Founding Access is complimentary through 31 December 2026, subject to
            fair-use limits.
          </Text>
          {organization ? (
            <Section style={refBox}>
              <Text style={refLabel}>Organization</Text>
              <Text style={refValue}>{organization}</Text>
            </Section>
          ) : null}
          <Text style={text}>
            Use the secure one-time link below to set up your account. This link does not contain a
            password — you will create your own credentials when you accept.
          </Text>
          {inviteUrl ? (
            <Text style={text}>
              <Link href={inviteUrl} style={cta}>
                Accept invitation
              </Link>
            </Text>
          ) : null}
          <Text style={text}>
            After signing in, start with the repository:{" "}
            <Link href={`${base}/repository`} style={link}>
              {base}/repository
            </Link>
          </Text>
          <Hr style={hr} />
          <Text style={footer}>
            Questions? Write to{" "}
            <Link href="mailto:info@aigilityx.com" style={link}>
              info@aigilityx.com
            </Link>
            .
          </Text>
        </Container>
      </Body>
    </Html>
  );
};

export const template = {
  component: Email,
  subject: "Your UseCasesX Pro Founding Access invitation",
  displayName: "Founding Access invite",
  previewData: {
    name: "Jordan Ellis",
    organization: "Northwind Health",
    inviteUrl: "https://usecasesx.aigilityx.com/auth/confirm?token=example",
  },
} satisfies TemplateEntry;

const main = { backgroundColor: "#ffffff", fontFamily: "Helvetica, Arial, sans-serif" };
const container = { padding: "32px 28px", maxWidth: "560px" };
const brand = {
  fontSize: "12px",
  letterSpacing: "1.5px",
  textTransform: "uppercase" as const,
  color: "#8a6a12",
  margin: "0 0 12px",
};
const heading = { fontSize: "24px", lineHeight: "32px", color: "#111a2e", margin: "0 0 16px" };
const text = { fontSize: "15px", lineHeight: "24px", color: "#33415c", margin: "0 0 14px" };
const refBox = {
  backgroundColor: "#f6f7fb",
  borderLeft: "3px solid #c9a227",
  padding: "12px 16px",
  margin: "18px 0",
};
const refLabel = { fontSize: "13px", color: "#6b7280", margin: "0 0 4px" };
const refValue = { fontSize: "16px", color: "#111a2e", margin: "0", fontWeight: 600 };
const cta = {
  display: "inline-block",
  backgroundColor: "#c9a227",
  color: "#111a2e",
  fontWeight: 700,
  textDecoration: "none",
  padding: "12px 18px",
  borderRadius: "6px",
};
const hr = { borderColor: "#e5e7eb", margin: "24px 0" };
const footer = { fontSize: "13px", lineHeight: "20px", color: "#6b7280", margin: "0" };
const link = { color: "#8a6a12" };
