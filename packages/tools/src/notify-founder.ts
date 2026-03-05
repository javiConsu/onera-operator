import { tool } from "ai";
import { z } from "zod";
import { EmailClient } from "@azure/communication-email";

/**
 * Builds the notification email HTML matching the OneraOS blueprint aesthetic.
 */
function buildNotificationHtml(params: {
  companyName: string;
  subject: string;
  message: string;
  dashboardUrl: string;
}): string {
  const paragraphs = params.message
    .split("\n\n")
    .map((p) => p.trim())
    .filter(Boolean)
    .map((p) => {
      const html = p.replace(/\n/g, "<br>");
      return `<p style="margin: 0 0 14px; line-height: 1.65; color: #141D33; font-size: 14px;">${html}</p>`;
    })
    .join("");

  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${params.subject}</title>
</head>
<body style="margin: 0; padding: 0; background-color: #FBFCFF; background-image: linear-gradient(#E5ECFF 1px, transparent 1px), linear-gradient(90deg, #E5ECFF 1px, transparent 1px); background-size: 24px 24px;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
    <tr>
      <td align="center" style="padding: 32px 16px;">

        <!-- Main card -->
        <table role="presentation" width="560" cellspacing="0" cellpadding="0" style="background: #FFFFFF; border: 1.5px dashed #A3B3D6;">

          <!-- Header bar -->
          <tr>
            <td style="padding: 16px 24px; border-bottom: 2px solid #0033CC;">
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
                <tr>
                  <td>
                    <span style="font-family: 'JetBrains Mono', 'Courier New', monospace; font-size: 11px; font-weight: 600; color: #0033CC; text-transform: uppercase; letter-spacing: 0.05em;">&gt; ONERA OPERATOR</span>
                  </td>
                  <td align="right">
                    <span style="font-family: 'JetBrains Mono', 'Courier New', monospace; font-size: 10px; color: #4B5363; text-transform: uppercase; letter-spacing: 0.05em;">${params.companyName}</span>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Body -->
          <tr>
            <td style="padding: 24px 24px 16px; font-family: Inter, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;">
              ${paragraphs}
            </td>
          </tr>

          <!-- CTA -->
          <tr>
            <td style="padding: 0 24px 24px;">
              <table role="presentation" cellspacing="0" cellpadding="0">
                <tr>
                  <td style="border: 2px solid #0033CC; background-color: #0033CC;">
                    <a href="${params.dashboardUrl}" style="display: inline-block; padding: 8px 20px; font-family: 'JetBrains Mono', 'Courier New', monospace; font-size: 11px; font-weight: 600; color: #FFFFFF; text-decoration: none; text-transform: uppercase; letter-spacing: 0.025em;">View Dashboard &rarr;</a>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding: 16px 24px; border-top: 1px dashed #A3B3D6;">
              <p style="margin: 0; font-family: 'JetBrains Mono', 'Courier New', monospace; font-size: 10px; color: #4B5363; line-height: 1.6; text-transform: uppercase; letter-spacing: 0.05em;">
                Onera Operator / COO for ${params.companyName}
              </p>
            </td>
          </tr>

        </table>

      </td>
    </tr>
  </table>
</body>
</html>`;
}

/**
 * Notify Founder Tool
 *
 * Sends a proactive insight or update email to the startup founder.
 * Use this when the operator discovers something the founder should know:
 * research findings, competitive intel, market trends, important updates, etc.
 *
 * This is NOT for cold outreach. This is internal communication to the founder.
 */
export const notifyFounder = tool({
  description:
    "Send a proactive update email to the startup founder. " +
    "Use this when you discover something the founder should know: " +
    "research findings, competitive intelligence, market opportunities, " +
    "important insights, or status updates on completed work. " +
    "Extract the Founder Email, Company Email, and Startup Name from the startup context. " +
    "Keep messages concise and actionable. Do NOT use this for cold outreach to external people.",
  parameters: z.object({
    founderEmail: z
      .string()
      .email()
      .describe("The founder's email address (from 'Founder Email' in the startup context)"),
    companyEmail: z
      .string()
      .email()
      .describe("The company sender email (from 'Company Email' in the startup context, e.g. companyname@onera.app)"),
    companyName: z
      .string()
      .describe("The startup name (from 'Startup Name' in the startup context)"),
    subject: z
      .string()
      .describe("A clear, specific subject line (e.g. 'Competitor X just launched a new feature')"),
    message: z
      .string()
      .describe(
        "The notification message. Write like a smart coworker, not a corporate AI. " +
        "Lead with the key finding. Be direct and specific. " +
        "Short paragraphs. No filler phrases like 'I wanted to let you know' or 'I am pleased to share'. " +
        "End with what they should do about it, if anything."
      ),
  }),
  execute: async ({ founderEmail, companyEmail, companyName, subject, message }) => {
    // Validate basics
    if (!subject || subject.trim().length < 5) {
      return {
        status: "rejected",
        reason: "Subject line is too short. Be specific about what you are notifying the founder about.",
      };
    }

    if (!message || message.trim().length < 30) {
      return {
        status: "rejected",
        reason: "Message is too short. Provide enough context for the founder to act on.",
      };
    }

    const connectionString = process.env.AZURE_EMAIL_CONNECTION_STRING;
    const dashboardUrl = process.env.FRONTEND_URL || "http://localhost:3000";

    if (!connectionString) {
      console.log(
        `[notifyFounder] AZURE_EMAIL_CONNECTION_STRING not set. Would notify ${founderEmail}:\n` +
        `  Subject: ${subject}\n  Message: ${message.substring(0, 200)}...`
      );
      return {
        status: "logged",
        to: founderEmail,
        subject,
        messagePreview: message.substring(0, 100),
        note: "Email logged (not sent). Set AZURE_EMAIL_CONNECTION_STRING to enable live sending.",
      };
    }

    try {
      const emailClient = new EmailClient(connectionString);

      const htmlBody = buildNotificationHtml({
        companyName,
        subject,
        message,
        dashboardUrl: `${dashboardUrl}/dashboard`,
      });

      const poller = await emailClient.beginSend({
        senderAddress: companyEmail,
        content: {
          subject: `[${companyName}] ${subject}`,
          html: htmlBody,
          plainText: `${subject}\n\n${message}\n\nView your dashboard: ${dashboardUrl}/dashboard\n\nOnera Operator\nCOO for ${companyName}`,
        },
        recipients: {
          to: [{ address: founderEmail }],
        },
        replyTo: [{ address: founderEmail }],
      });

      const result = await poller.pollUntilDone();

      if (result.status === "Succeeded") {
        console.log(`[notifyFounder] Sent "${subject}" to ${founderEmail}`);
        return {
          status: "sent",
          to: founderEmail,
          subject,
          messagePreview: message.substring(0, 100),
        };
      } else {
        console.error("[notifyFounder] Azure ECS error:", result.error);
        return {
          status: "failed",
          to: founderEmail,
          subject,
          error: result.error?.message || `Send status: ${result.status}`,
        };
      }
    } catch (err) {
      const errMsg = err instanceof Error ? err.message : String(err);
      console.error("[notifyFounder] Failed:", errMsg);
      return {
        status: "failed",
        to: founderEmail,
        subject,
        error: errMsg,
      };
    }
  },
});
