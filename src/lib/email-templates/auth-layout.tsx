import * as React from "react";
import {
  Body,
  Button,
  Container,
  Head,
  Heading,
  Hr,
  Html,
  Link,
  Preview,
  Text,
} from "@react-email/components";

/**
 * Shared brand shell for UseCasesX auth emails.
 * Body background stays #ffffff for email-client compatibility.
 */
export const AuthEmailLayout = ({
  preview,
  heading,
  children,
  ctaLabel,
  ctaUrl,
  footerNote,
}: {
  preview: string;
  heading: string;
  children: React.ReactNode;
  ctaLabel?: string;
  ctaUrl?: string;
  footerNote?: string;
}) => (
  <Html lang="en" dir="ltr">
    <Head />
    <Preview>{preview}</Preview>
    <Body style={main}>
      <Container style={container}>
        <Text style={brand}>UseCasesX™ by AIgilityX™</Text>
        <Heading style={headingStyle}>{heading}</Heading>
        {children}
        {ctaLabel && ctaUrl ? (
          <Button style={button} href={ctaUrl}>
            {ctaLabel}
          </Button>
        ) : null}
        <Hr style={hr} />
        <Text style={footer}>
          {footerNote ? `${footerNote} ` : ""}Questions? Write to{" "}
          <Link href="mailto:info@aigilityx.com" style={link}>
            info@aigilityx.com
          </Link>
          .
        </Text>
      </Container>
    </Body>
  </Html>
);

export const text = {
  fontSize: "15px",
  lineHeight: "24px",
  color: "#33415c",
  margin: "0 0 14px",
};
export const link = { color: "#8a6a12" };
export const codeBox = {
  backgroundColor: "#f6f7fb",
  borderLeft: "3px solid #c9a227",
  padding: "14px 18px",
  margin: "18px 0",
  fontSize: "26px",
  letterSpacing: "4px",
  fontWeight: 700 as const,
  color: "#111a2e",
};

const main = { backgroundColor: "#ffffff", fontFamily: "Helvetica, Arial, sans-serif" };
const container = { padding: "32px 28px", maxWidth: "560px" };
const brand = {
  fontSize: "12px",
  letterSpacing: "1.5px",
  textTransform: "uppercase" as const,
  color: "#8a6a12",
  margin: "0 0 12px",
};
const headingStyle = {
  fontSize: "24px",
  lineHeight: "32px",
  color: "#111a2e",
  margin: "0 0 16px",
};
const button = {
  backgroundColor: "#111a2e",
  color: "#ffffff",
  fontSize: "15px",
  borderRadius: "8px",
  padding: "13px 22px",
  textDecoration: "none",
  display: "inline-block",
};
const hr = { borderColor: "#e5e7eb", margin: "26px 0" };
const footer = { fontSize: "13px", lineHeight: "20px", color: "#6b7280", margin: "0" };
