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
  referenceId?: string;
  interestArea?: string | null;
}

const Email = ({ name, referenceId, interestArea }: Props) => (
  <Html lang="en" dir="ltr">
    <Head />
    <Preview>Your UseCasesX Founding Access place is reserved</Preview>
    <Body style={main}>
      <Container style={container}>
        <Text style={brand}>UseCasesX™ by AIgilityX™</Text>
        <Heading style={heading}>You&apos;re on the Founding Access list</Heading>
        <Text style={text}>
          {name ? `Hello ${name},` : "Hello,"} thank you for requesting early access to UseCasesX™ —
          the Global AI Use Case Repository, AI Opportunity Map and AI Use Case Studio™.
        </Text>
        {referenceId ? (
          <Section style={refBox}>
            <Text style={refLabel}>Your reference</Text>
            <Text style={refValue}>{referenceId}</Text>
          </Section>
        ) : null}
        {interestArea ? <Text style={text}>Area of interest: {interestArea}</Text> : null}
        <Heading as="h2" style={subheading}>
          What happens next
        </Heading>
        <Text style={text}>
          1. We review your request and confirm your Pro Founding Access seat, complimentary through
          31 December 2026.
          <br />
          2. You receive your sign-in invitation with a link to the repository and the AI Use Case
          Studio™.
          <br />
          3. Keep the reference above handy if you contact us about your request.
        </Text>
        <Hr style={hr} />
        <Text style={footer}>
          Questions? Reply to this email or write to{" "}
          <Link href="mailto:info@aigilityx.com" style={link}>
            info@aigilityx.com
          </Link>
          .
        </Text>
      </Container>
    </Body>
  </Html>
);

export const template = {
  component: Email,
  subject: "Your UseCasesX Founding Access request is confirmed",
  displayName: "Waitlist confirmation",
  previewData: {
    name: "Jordan Ellis",
    referenceId: "UCX-8F32AK",
    interestArea: "Public sector service delivery",
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
const subheading = { fontSize: "16px", color: "#111a2e", margin: "24px 0 8px" };
const text = { fontSize: "15px", lineHeight: "24px", color: "#33415c", margin: "0 0 14px" };
const refBox = {
  backgroundColor: "#f6f7fb",
  borderLeft: "3px solid #c9a227",
  padding: "12px 16px",
  margin: "18px 0",
};
const refLabel = { fontSize: "12px", color: "#6b7280", margin: "0 0 4px" };
const refValue = { fontSize: "18px", color: "#111a2e", margin: "0", fontWeight: 700 };
const hr = { borderColor: "#e5e7eb", margin: "24px 0" };
const footer = { fontSize: "13px", lineHeight: "20px", color: "#6b7280", margin: "0" };
const link = { color: "#8a6a12" };
