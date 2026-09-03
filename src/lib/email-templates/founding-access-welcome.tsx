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
  role?: string | null;
  sector?: string | null;
  workspaceName?: string | null;
  appUrl?: string | null;
}

const Email = ({ name, organization, role, sector, workspaceName, appUrl }: Props) => {
  const base = appUrl || "https://usecasesx.aigilityx.com";
  return (
    <Html lang="en" dir="ltr">
      <Head />
      <Preview>Your UseCasesX Pro Founding Access workspace is ready</Preview>
      <Body style={main}>
        <Container style={container}>
          <Text style={brand}>UseCasesX™ by AIgilityX™</Text>
          <Heading style={heading}>Your Pro workspace is active</Heading>
          <Text style={text}>
            {name ? `Hello ${name},` : "Hello,"} your Pro Founding Access workspace is set up and
            ready to use — complimentary through 31 December 2026, subject to fair-use limits.
          </Text>
          <Section style={refBox}>
            {workspaceName ? (
              <Text style={refValue}>{workspaceName}</Text>
            ) : (
              <Text style={refValue}>Your workspace</Text>
            )}
            {organization ? <Text style={refLabel}>Organization: {organization}</Text> : null}
            {role ? <Text style={refLabel}>Role: {role}</Text> : null}
            {sector ? <Text style={refLabel}>Sector: {sector}</Text> : null}
          </Section>
          <Heading as="h2" style={subheading}>
            Get started
          </Heading>
          <Text style={text}>
            1. Browse the repository and shortlist relevant use cases:{" "}
            <Link href={`${base}/repository`} style={link}>
              {base}/repository
            </Link>
            <br />
            2. Capture an opportunity and design it in the AI Use Case Studio™:{" "}
            <Link href={`${base}/ai-use-case-studio`} style={link}>
              {base}/ai-use-case-studio
            </Link>
            <br />
            3. Score, prioritise and build your portfolio and roadmap:{" "}
            <Link href={`${base}/pro`} style={link}>
              {base}/pro
            </Link>
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
};

export const template = {
  component: Email,
  subject: "Your UseCasesX Pro workspace is ready",
  displayName: "Founding Access welcome",
  previewData: {
    name: "Jordan Ellis",
    organization: "Northwind Health",
    role: "Head of Transformation",
    sector: "Healthcare",
    workspaceName: "Northwind Health Workspace",
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
const refLabel = { fontSize: "13px", color: "#6b7280", margin: "0 0 4px" };
const refValue = { fontSize: "18px", color: "#111a2e", margin: "0 0 8px", fontWeight: 700 };
const hr = { borderColor: "#e5e7eb", margin: "24px 0" };
const footer = { fontSize: "13px", lineHeight: "20px", color: "#6b7280", margin: "0" };
const link = { color: "#8a6a12" };
