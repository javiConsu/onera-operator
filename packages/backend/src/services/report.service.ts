import { prisma } from "@onera/database";
import { EmailClient } from "@azure/communication-email";

export async function createDailyReport(data: {
  projectId: string;
  content: string;
  tasksCompleted?: string;
  tasksPlanned?: string;
  metrics?: string;
}) {
  // Calculate day number since project creation using calendar-date arithmetic
  const project = await prisma.project.findUnique({
    where: { id: data.projectId },
    select: { createdAt: true },
  });

  if (!project) {
    throw new Error(`Project not found: ${data.projectId}`);
  }

  // Compare calendar dates to avoid time-of-day sensitivity
  const createdDate = new Date(project.createdAt);
  createdDate.setHours(0, 0, 0, 0);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const diffDays = Math.floor(
    (today.getTime() - createdDate.getTime()) / (1000 * 60 * 60 * 24)
  );
  const day = Math.max(1, diffDays + 1);

  return prisma.dailyReport.create({
    data: { ...data, day },
  });
}

export async function getLatestReport(projectId: string) {
  return prisma.dailyReport.findFirst({
    where: { projectId },
    orderBy: { date: "desc" },
  });
}

export async function listReports(projectId: string, limit = 30) {
  return prisma.dailyReport.findMany({
    where: { projectId },
    orderBy: { date: "desc" },
    take: limit,
  });
}

/**
 * Send a daily digest email to the project owner via Azure Email Communication Service.
 * This mirrors Polsia's "morning email" feature where the AI sends
 * the founder a summary of what was accomplished and what's planned.
 */
export async function sendDailyDigestEmail(params: {
  projectId: string;
  projectName: string;
  reportContent: string;
  highlights: string[];
  nextSteps: string[];
  completedCount: number;
  pendingCount: number;
  date: string;
}): Promise<void> {
  const connectionString = process.env.AZURE_EMAIL_CONNECTION_STRING;

  if (!connectionString) {
    console.log(`[sendDailyDigestEmail] AZURE_EMAIL_CONNECTION_STRING not set — skipping email for ${params.projectName}`);
    return;
  }

  // Get the project owner's email and the project's company email
  const project = await prisma.project.findUnique({
    where: { id: params.projectId },
    include: { user: { select: { email: true, name: true } } },
  });

  // Use the company-specific sender if available, otherwise fall back to default
  const senderAddress = project?.companyEmail || (process.env.AZURE_EMAIL_SENDER || "operator@onera.app");

  if (!project?.user?.email) {
    console.warn(`[sendDailyDigestEmail] No email found for project owner of ${params.projectName}`);
    return;
  }

  const ownerName = project.user.name || "Founder";
  const ownerEmail = project.user.email;

  const dashboardUrl = `${process.env.FRONTEND_URL || "http://localhost:3000"}/dashboard`;

  const highlightItems =
    params.highlights.length > 0
      ? params.highlights
      : ["Agent loop ran successfully"];

  const nextStepItems =
    params.nextSteps.length > 0
      ? params.nextSteps
      : ["Continuous loop running every 4 hours"];

  const highlightsHtml = highlightItems
    .map(
      (h) =>
        `<tr><td style="padding: 3px 0; font-size: 13px; color: #141D33; line-height: 1.5; font-family: Inter, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;"><span style="color: #0033CC; font-family: 'JetBrains Mono', monospace; font-size: 11px;">&#10003;</span>&nbsp; ${h}</td></tr>`
    )
    .join("");

  const nextStepsHtml = nextStepItems
    .map(
      (s, i) =>
        `<tr><td style="padding: 3px 0; font-size: 13px; color: #141D33; line-height: 1.5; font-family: Inter, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;"><span style="color: #4B5363; font-family: 'JetBrains Mono', monospace; font-size: 11px;">${i + 1}.</span>&nbsp; ${s}</td></tr>`
    )
    .join("");

  // Trim the full report for email and escape basic HTML
  const reportPreview = params.reportContent
    .substring(0, 1500)
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");

  const htmlBody = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Daily Digest: ${params.projectName}</title>
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
                    <span style="font-family: 'JetBrains Mono', 'Courier New', monospace; font-size: 10px; color: #4B5363; text-transform: uppercase; letter-spacing: 0.05em;">${params.date}</span>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Greeting -->
          <tr>
            <td style="padding: 24px 24px 14px; font-family: Inter, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; font-size: 14px; color: #141D33; line-height: 1.65;">
              <p style="margin: 0 0 14px;">Hey ${ownerName},</p>
              <p style="margin: 0;">Here's what happened with <strong>${params.projectName}</strong> today. ${params.completedCount} tasks done, ${params.pendingCount} queued up for next cycle.</p>
            </td>
          </tr>

          <!-- Completed section -->
          <tr>
            <td style="padding: 16px 24px 8px;">
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="border: 1px dashed #A3B3D6; background: #FBFCFF;">
                <tr>
                  <td style="padding: 12px 16px;">
                    <p style="margin: 0 0 8px; font-family: 'JetBrains Mono', 'Courier New', monospace; font-size: 10px; font-weight: 600; color: #0033CC; text-transform: uppercase; letter-spacing: 0.05em;">Shipped</p>
                    <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
                      ${highlightsHtml}
                    </table>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Next steps section -->
          <tr>
            <td style="padding: 8px 24px;">
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="border: 1px dashed #A3B3D6; background: #FBFCFF;">
                <tr>
                  <td style="padding: 12px 16px;">
                    <p style="margin: 0 0 8px; font-family: 'JetBrains Mono', 'Courier New', monospace; font-size: 10px; font-weight: 600; color: #4B5363; text-transform: uppercase; letter-spacing: 0.05em;">Up Next</p>
                    <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
                      ${nextStepsHtml}
                    </table>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Full report preview -->
          <tr>
            <td style="padding: 8px 24px 16px;">
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="border: 1px dashed #A3B3D6;">
                <tr>
                  <td style="padding: 12px 16px;">
                    <p style="margin: 0 0 8px; font-family: 'JetBrains Mono', 'Courier New', monospace; font-size: 10px; font-weight: 600; color: #4B5363; text-transform: uppercase; letter-spacing: 0.05em;">Full Report</p>
                    <pre style="margin: 0; font-family: 'JetBrains Mono', 'Courier New', monospace; font-size: 11px; color: #4B5363; white-space: pre-wrap; line-height: 1.5; max-height: 300px; overflow: hidden;">${reportPreview}${params.reportContent.length > 1500 ? "\n\n..." : ""}</pre>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- CTA -->
          <tr>
            <td style="padding: 0 24px 24px;">
              <table role="presentation" cellspacing="0" cellpadding="0">
                <tr>
                  <td style="border: 2px solid #0033CC; background-color: #0033CC;">
                    <a href="${dashboardUrl}" style="display: inline-block; padding: 8px 20px; font-family: 'JetBrains Mono', 'Courier New', monospace; font-size: 11px; font-weight: 600; color: #FFFFFF; text-decoration: none; text-transform: uppercase; letter-spacing: 0.025em;">Open Dashboard &rarr;</a>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding: 16px 24px; border-top: 1px dashed #A3B3D6;">
              <p style="margin: 0; font-family: 'JetBrains Mono', 'Courier New', monospace; font-size: 10px; color: #4B5363; line-height: 1.6; text-transform: uppercase; letter-spacing: 0.05em;">
                Onera Operator / COO for ${params.projectName}
              </p>
              <p style="margin: 6px 0 0; font-family: Inter, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; font-size: 11px; color: #A3B3D6;">
                Running 24/7. Reply to this email or check the dashboard anytime.
              </p>
            </td>
          </tr>

        </table>

      </td>
    </tr>
  </table>
</body>
</html>`;

  try {
    const emailClient = new EmailClient(connectionString);
    const poller = await emailClient.beginSend({
      senderAddress,
      content: {
        subject: `[${params.projectName}] Here's what happened today`,
        html: htmlBody,
        plainText: `Hey ${ownerName},\n\nHere's what happened with ${params.projectName} today. ${params.completedCount} tasks done, ${params.pendingCount} queued up.\n\nShipped:\n${highlightItems.map((h) => `  * ${h}`).join("\n")}\n\nUp next:\n${nextStepItems.map((s, i) => `  ${i + 1}. ${s}`).join("\n")}\n\nFull report:\n${params.reportContent.substring(0, 2000)}\n\nOpen your dashboard: ${dashboardUrl}\n\nOnera Operator / COO for ${params.projectName}`,
      },
      recipients: {
        to: [{ address: ownerEmail }],
      },
      replyTo: [{ address: ownerEmail }],
    });

    const result = await poller.pollUntilDone();

    if (result.status === "Succeeded") {
      console.log(`[sendDailyDigestEmail] Digest sent to ${ownerEmail} for ${params.projectName}`);
    } else {
      console.error("[sendDailyDigestEmail] Azure ECS error:", result.error);
    }
  } catch (err) {
    console.error("[sendDailyDigestEmail] Failed to send digest:", err instanceof Error ? err.message : err);
  }
}
