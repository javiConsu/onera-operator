import { prisma } from "@onera/database";
import { EmailClient } from "@azure/communication-email";
import { ClientSecretCredential } from "@azure/identity";

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const EMAIL_DOMAIN = "onera.app";
const SUBSCRIPTION_ID = "a6605f29-cd61-42a8-9485-11875b8a0b29";
const RESOURCE_GROUP = "onera";
const EMAIL_SERVICE_NAME = "onera-operator";
const ARM_API_VERSION = "2023-04-01";

// ---------------------------------------------------------------------------
// Shared email infrastructure
// ---------------------------------------------------------------------------

function getEmailClient(): EmailClient | null {
  const connectionString = process.env.AZURE_EMAIL_CONNECTION_STRING;
  if (!connectionString) return null;
  return new EmailClient(connectionString);
}

/**
 * Low-level helper — sends one email via Azure ECS.
 * Returns true on success, false on failure. Never throws.
 */
async function sendTransactionalEmail(params: {
  from: string;
  to: string;
  subject: string;
  html: string;
  plainText: string;
  replyTo?: string;
}): Promise<boolean> {
  const client = getEmailClient();
  if (!client) {
    console.log(
      `[email] AZURE_EMAIL_CONNECTION_STRING not set — skipping email to ${params.to}`
    );
    return false;
  }

  try {
    const poller = await client.beginSend({
      senderAddress: params.from,
      content: {
        subject: params.subject,
        html: params.html,
        plainText: params.plainText,
      },
      recipients: {
        to: [{ address: params.to }],
      },
      ...(params.replyTo && {
        replyTo: [{ address: params.replyTo }],
      }),
    });

    const result = await poller.pollUntilDone();

    if (result.status === "Succeeded") {
      console.log(`[email] Sent "${params.subject}" to ${params.to} from ${params.from}`);
      return true;
    }

    console.error(`[email] Failed to send to ${params.to}:`, result.error);
    return false;
  } catch (err) {
    console.error(
      "[email] Send error:",
      err instanceof Error ? err.message : err
    );
    return false;
  }
}

// ---------------------------------------------------------------------------
// Azure ARM helper — for managing sender usernames
// ---------------------------------------------------------------------------

async function getArmToken(): Promise<string | null> {
  const tenantId = process.env.AZURE_TENANT_ID;
  const clientId = process.env.AZURE_CLIENT_ID;
  const clientSecret = process.env.AZURE_CLIENT_SECRET;

  if (!tenantId || !clientId || !clientSecret) {
    console.warn(
      "[email] AZURE_TENANT_ID / AZURE_CLIENT_ID / AZURE_CLIENT_SECRET not set — cannot manage sender usernames"
    );
    return null;
  }

  try {
    const credential = new ClientSecretCredential(tenantId, clientId, clientSecret);
    const token = await credential.getToken("https://management.azure.com/.default");
    return token.token;
  } catch (err) {
    console.error(
      "[email] Failed to get ARM token:",
      err instanceof Error ? err.message : err
    );
    return null;
  }
}

// ---------------------------------------------------------------------------
// Provision a company-specific sender email (e.g. companyname@onera.app)
// ---------------------------------------------------------------------------

/**
 * Converts a company name to a valid email username.
 * - Lowercased, alphanumeric + hyphens only, max 64 chars
 * - e.g. "Acme Corp" → "acmecorp", "My Start-Up!" → "my-start-up"
 */
function toEmailUsername(companyName: string): string {
  return companyName
    .toLowerCase()
    .replace(/[^a-z0-9-]/g, "")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .substring(0, 64) || "company";
}

/**
 * Creates a sender username on Azure Email Communication Service via the ARM API.
 * Returns the full email address (e.g. "acmecorp@onera.app") on success, null on failure.
 */
export async function provisionCompanyEmail(
  companyName: string
): Promise<string | null> {
  const token = await getArmToken();
  if (!token) {
    console.warn(
      `[email] Cannot provision sender for "${companyName}" — no ARM credentials`
    );
    return null;
  }

  const username = toEmailUsername(companyName);
  const email = `${username}@${EMAIL_DOMAIN}`;

  const url =
    `https://management.azure.com/subscriptions/${SUBSCRIPTION_ID}` +
    `/resourceGroups/${RESOURCE_GROUP}` +
    `/providers/Microsoft.Communication/emailServices/${EMAIL_SERVICE_NAME}` +
    `/domains/${EMAIL_DOMAIN}` +
    `/senderUsernames/${username}?api-version=${ARM_API_VERSION}`;

  try {
    const response = await fetch(url, {
      method: "PUT",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        properties: {
          username,
          displayName: companyName,
        },
      }),
    });

    if (response.ok) {
      console.log(`[email] Provisioned sender: ${email} (display: "${companyName}")`);
      return email;
    }

    // 409 = already exists, which is fine
    if (response.status === 409) {
      console.log(`[email] Sender ${email} already exists — reusing`);
      return email;
    }

    const body = await response.text();
    console.error(
      `[email] Failed to provision sender ${email}: ${response.status} ${body}`
    );
    return null;
  } catch (err) {
    console.error(
      "[email] Provision error:",
      err instanceof Error ? err.message : err
    );
    return null;
  }
}

// ---------------------------------------------------------------------------
// Welcome email — sent after project research completes
// ---------------------------------------------------------------------------

export async function sendWelcomeEmail(params: {
  projectId: string;
  projectName: string;
  companyEmail: string;
  website: string;
  description?: string;
  product?: string;
}): Promise<void> {
  // Look up the owner's email and name
  const project = await prisma.project.findUnique({
    where: { id: params.projectId },
    include: { user: { select: { email: true, name: true } } },
  });

  if (!project?.user?.email) {
    console.warn(
      `[email] No email for owner of "${params.projectName}" — skipping welcome email`
    );
    return;
  }

  const ownerName = project.user.name || "there";
  const ownerEmail = project.user.email;
  const dashboardUrl = `${process.env.FRONTEND_URL || "http://localhost:3000"}/dashboard`;

  const subject = `${params.projectName} is live. Here's what I found.`;

  const plainText = `Hey ${ownerName},

Quick heads up: I just finished going through ${params.projectName} (${params.website}) and I'm ready to get started.

${params.product ? `Here's what I picked up about your product: ${params.product}` : ""}
${params.description ? `${params.description}` : ""}

Your company email is set up: ${params.companyEmail}. All outreach and updates will come from this address.

I'm already planning your first batch of tasks: growth moves, outreach targets, competitive research. You can watch it happen in real time on your dashboard.

${dashboardUrl}

Talk soon,
Onera Operator
COO for ${params.projectName}`;

  const html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${params.projectName} is live</title>
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
                    <span style="font-family: 'JetBrains Mono', 'Courier New', monospace; font-size: 10px; color: #4B5363; text-transform: uppercase; letter-spacing: 0.05em;">WELCOME</span>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Body -->
          <tr>
            <td style="padding: 24px 24px 8px; font-family: Inter, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; font-size: 14px; color: #141D33; line-height: 1.65;">

              <p style="margin: 0 0 14px;">Hey ${ownerName},</p>

              <p style="margin: 0 0 14px;">
                I just finished going through
                <a href="${params.website}" style="color: #0033CC; text-decoration: none; font-weight: 600;">${params.projectName}</a>
                and I'm ready to get to work.
              </p>

              ${
                params.product || params.description
                  ? `<!-- Research findings -->
                    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin: 0 0 16px;">
                      <tr>
                        <td style="padding: 12px 16px; border: 1px dashed #A3B3D6; background: #FBFCFF;">
                          <p style="margin: 0 0 4px; font-family: 'JetBrains Mono', 'Courier New', monospace; font-size: 10px; font-weight: 600; color: #4B5363; text-transform: uppercase; letter-spacing: 0.05em;">What I picked up</p>
                          ${params.product ? `<p style="margin: 4px 0; font-size: 13px; color: #141D33; line-height: 1.6;">${params.product}</p>` : ""}
                          ${params.description ? `<p style="margin: 4px 0; font-size: 13px; color: #4B5363; line-height: 1.6;">${params.description}</p>` : ""}
                        </td>
                      </tr>
                    </table>`
                  : ""
              }

              <p style="margin: 0 0 14px;">
                Your company email is set up:
                <strong style="color: #0033CC;">${params.companyEmail}</strong>.
                All outreach and updates will come from this address.
              </p>

              <p style="margin: 0 0 20px;">
                I'm already planning your first batch of tasks: growth moves, outreach targets, competitive research. You can watch it happen live.
              </p>

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
              <p style="margin: 4px 0 0; font-family: 'JetBrains Mono', 'Courier New', monospace; font-size: 10px; color: #A3B3D6;">
                ${params.companyEmail}
              </p>
            </td>
          </tr>

        </table>

      </td>
    </tr>
  </table>
</body>
</html>`;

  await sendTransactionalEmail({
    from: params.companyEmail,
    to: ownerEmail,
    subject,
    html,
    plainText,
    replyTo: ownerEmail,
  });
}
