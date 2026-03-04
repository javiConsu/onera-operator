import { tool } from "ai";
import { z } from "zod";

export const sendEmail = tool({
  description:
    "Send an email. In v1 this is a mock that logs the email. " +
    "In production, connect to an email service (SendGrid, Resend, etc.).",
  parameters: z.object({
    to: z.string().email().describe("Recipient email address"),
    subject: z.string().describe("Email subject line"),
    body: z.string().describe("Email body content"),
    replyTo: z.string().email().optional().describe("Reply-to address"),
  }),
  execute: async ({ to, subject, body, replyTo }) => {
    // In production, this would call an email API (SendGrid, Resend, etc.)
    return {
      status: "queued",
      to,
      subject,
      bodyPreview: body.substring(0, 100) + "...",
      replyTo: replyTo || undefined,
      message:
        "Email queued for sending. Connect an email service provider to enable live sending.",
    };
  },
});
