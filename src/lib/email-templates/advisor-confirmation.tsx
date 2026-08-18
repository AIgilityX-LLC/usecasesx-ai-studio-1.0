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
    <Preview>Your UseCasesX advisor session request has been received</Preview>
    <Body style={main}>
      <Container style={container}>
        <Text style={brand}>UseCasesX™ by AIgilityX™</Text>
        <Heading style={heading}>Your advisor request is with us</Heading>
        <Text style={text}>
          {name ? `Hello ${name},` : "Hello,"} thank you for asking to speak with an AIgilityX
          advisor about your AI use case portfolio.
        </Text>
        {referenceId ? (
          <Section style={refBox}>
            <Text style={refLabel}>Your reference</Text>
            <Text style={refValue}>{referenceId}</Text>
          </Section>
        ) : null}
        {interestArea ? <Text style={text}>Focus area you shared: {interestArea}</Text> : null}
        <Heading as="h2" style={subheading}>
          What happens next
        </Heading>
        <Text style={text}>
          1. An advisor reviews your request and replies within two business days.
          <br />
          2. You agree a 30-minute session time by email — no scheduling account needed.
          <br />
          3. Bring one candidate use case; you leave with a scored, defensible next step.
        </Text>
        <Text style={text}>
          Need to move faster? Reply to this email with your preferred times and quote your
          reference.
        </Text>
        <Hr style={hr} />
        <Text style={footer}>
          You can also reach us directly at{" "}
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
  subject: "We received your UseCasesX advisor request",
  displayName: "Advisor request confirmation",
  previewData: {
    name: "Jordan Ellis",
    referenceId: "UCX-4B7QD1",
    interestArea: "AI opportunity prioritisation",
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
