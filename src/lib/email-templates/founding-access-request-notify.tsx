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
  fullName?: string;
  workEmail?: string;
  organization?: string | null;
  roleTitle?: string | null;
  requestedAt?: string | null;
  adminUrl?: string | null;
}

const Email = ({ fullName, workEmail, organization, roleTitle, requestedAt, adminUrl }: Props) => (
  <Html lang="en" dir="ltr">
    <Head />
    <Preview>New Founding Access request — review required</Preview>
    <Body style={main}>
      <Container style={container}>
        <Text style={brand}>UseCasesX™ by AIgilityX™</Text>
        <Heading style={heading}>New Founding Access request</Heading>
        <Text style={text}>
          Someone requested Early Gratis (Pro) Access. Review and approve or reject in the admin
          queue — do not grant access until reviewed.
        </Text>
        <Section style={refBox}>
          <Text style={refLabel}>Requester</Text>
          <Text style={refValue}>{fullName || "—"}</Text>
          <Text style={refLabel}>Work email</Text>
          <Text style={refValue}>{workEmail || "—"}</Text>
          {organization ? (
            <>
              <Text style={refLabel}>Organization</Text>
              <Text style={refValue}>{organization}</Text>
            </>
          ) : null}
          {roleTitle ? (
            <>
              <Text style={refLabel}>Role / title</Text>
              <Text style={refValue}>{roleTitle}</Text>
            </>
          ) : null}
          {requestedAt ? (
            <>
              <Text style={refLabel}>Requested at</Text>
              <Text style={refValue}>{requestedAt}</Text>
            </>
          ) : null}
        </Section>
        {adminUrl ? (
          <Text style={text}>
            Open the queue:{" "}
            <Link href={adminUrl} style={link}>
              {adminUrl}
            </Link>
          </Text>
        ) : null}
        <Hr style={hr} />
        <Text style={footer}>This notification was sent to info@aigilityx.com.</Text>
      </Container>
    </Body>
  </Html>
);

export const template = {
  component: Email,
  subject: "New UseCasesX Founding Access request",
  displayName: "Founding Access request (admin notify)",
  to: "info@aigilityx.com",
  previewData: {
    fullName: "Jordan Ellis",
    workEmail: "jordan@northwind.example",
    organization: "Northwind Health",
    roleTitle: "Head of Transformation",
    requestedAt: "29 Sep 2026, 15:00 UTC",
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
const refValue = { fontSize: "16px", color: "#111a2e", margin: "0 0 10px", fontWeight: 600 };
const hr = { borderColor: "#e5e7eb", margin: "24px 0" };
const footer = { fontSize: "13px", lineHeight: "20px", color: "#6b7280", margin: "0" };
const link = { color: "#8a6a12" };
