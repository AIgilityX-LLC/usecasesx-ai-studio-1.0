/**
 * Server-only rendering of the confirmation templates for admin preview.
 *
 * Preview renders the exact registered template with sample data — it never
 * sends, and it never accepts a recipient address.
 */
import * as React from "react";
import { render } from "@react-email/render";

import { TEMPLATES } from "@/lib/email-templates/registry";
import { samplePreviewData, type PreviewTemplate } from "./email-health";

export interface TemplatePreview {
  template: PreviewTemplate;
  displayName: string;
  subject: string;
  html: string;
  text: string;
}

export async function renderTemplatePreview(input: {
  template: PreviewTemplate;
  referenceId?: string;
  focusArea?: string | null;
  name?: string;
}): Promise<TemplatePreview> {
  const entry = TEMPLATES[input.template];
  if (!entry) throw new Error(`Unknown template '${input.template}'`);

  const data = samplePreviewData({
    referenceId: input.referenceId,
    focusArea: input.focusArea ?? null,
    name: input.name,
  });
  const element = React.createElement(entry.component, data);
  const [html, text] = await Promise.all([render(element), render(element, { plainText: true })]);
  const subject = typeof entry.subject === "function" ? entry.subject(data) : entry.subject;

  return {
    template: input.template,
    displayName: entry.displayName ?? input.template,
    subject,
    html,
    text,
  };
}
