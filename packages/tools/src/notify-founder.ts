import { tool } from "ai";
import { z } from "zod";
import { EmailClient } from "@azure/communication-email";

/**
 * Builds a clean, professional insight-notification HTML email.
 */
function buildNotificationHtml(params: {
  companyName: string;
  subject: string;
  message: string;
  dashboardUrl: string;
}): string {
  // Convert plain-text message to HTML paragraphs
  const paragraphs = params.message
    .split("\n\n")
    .map((p) => p.trim())
    .filter(Boolean)
    .map((p) => {
      const html = p.replace(/\n/g, "<br>");
      return `<p style="margin: 0 0 16px; line-height: 1.7; color: #1a1a1a;">${html}</p>`;
    })
    .join("");

  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${params.subject}</title>
</head>
<body style="margin: 0; padding: 0; background: #f7f7f7;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background: #f7f7f7;">
    <tr>
      <td align="center" style="padding: 40px 16px;">
        <table role="presentation" width="600" cellspacing="0" cellpadding="0" style="background: #ffffff; border-radius: 4px; border: 1px solid #e0e0e0;">

          <!-- Header -->
          <tr>
            <td style="padding: 24px 40px 16px; border-bottom: 2px solid #1a1a1a;">
              <p style="margin: 0; font-family: 'JetBrains Mono', 'Courier New', monospace; font-size: 14px; font-weight: 700; color: #1a1a1a; letter-spacing: 0.5px;">
                ONERA OPERATOR
              </p>
              <p style="margin: 4px 0 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Arial, sans-serif; font-size: 12px; color: #64748b;">
                Update for ${params.companyName}
              </p>
            </td>
          </tr>

          <!-- Body -->
          <tr>
            <td style="padding: 32px 40px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Arial, sans-serif; font-size: 15px;">
              ${paragraphs}

              <!-- CTA -->
              <table role="presentation" cellspacing="0" cellpadding="0" style="margin: 24px 0 32px;">
                <tr>
                  <td style="background: #1a1a1a; border-radius: 4px;">
                    <a href="${params.dashboardUrl}" style="display: inline-block; padding: 12px 28px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Arial, sans-serif; font-size: 14px; font-weight: 600; color: #ffffff; text-decoration: none; letter-spacing: 0.3px;">
                      View Dashboard &rarr;
                    </a>
                  </td>
                </tr>
              </table>

              <!-- Sign-off -->
              <p style="margin: 0; color: #64748b; font-size: 14px; line-height: 1.6;">
                Onera Operator<br>
                COO for ${params.companyName}
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
        "The notification message. Be concise and actionable. " +
        "Lead with the key insight, then provide context. " +
        "End with a recommendation or next step if applicable."
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
