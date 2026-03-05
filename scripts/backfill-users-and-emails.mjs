/**
 * One-time backfill script:
 * 1. Fetches real emails/names from Clerk API for all existing users
 * 2. Updates user records in the DB (replaces fake @onera.local emails)
 * 3. Provisions company emails (companyname@onera.app) for projects that don't have one
 *
 * Usage:
 *   node scripts/backfill-users-and-emails.mjs
 *
 * Required env vars:
 *   DATABASE_URL          — Postgres connection string
 *   CLERK_SECRET_KEY      — Clerk API secret key
 *   AZURE_TENANT_ID       — Azure SP tenant
 *   AZURE_CLIENT_ID       — Azure SP client ID
 *   AZURE_CLIENT_SECRET   — Azure SP client secret
 *
 * Reads from .env automatically via dotenv.
 */

import { readFileSync } from "fs";
import { createRequire } from "module";

// Load .env manually (no dotenv dependency)
try {
  const envFile = readFileSync(new URL("../.env", import.meta.url), "utf-8");
  for (const line of envFile.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eqIdx = trimmed.indexOf("=");
    if (eqIdx === -1) continue;
    const key = trimmed.slice(0, eqIdx).trim();
    let val = trimmed.slice(eqIdx + 1).trim();
    // Strip surrounding quotes
    if ((val.startsWith("'") && val.endsWith("'")) || (val.startsWith('"') && val.endsWith('"'))) {
      val = val.slice(1, -1);
    }
    if (!process.env[key]) process.env[key] = val;
  }
} catch {
  console.warn("No .env file found — using existing environment variables");
}
const require = createRequire(import.meta.url);

// Use the same Prisma client build that the monorepo uses (pnpm hoists it)
const { PrismaClient } = require("../node_modules/.pnpm/@prisma+client@6.19.2_prisma@6.19.2_typescript@5.9.3__typescript@5.9.3/node_modules/@prisma/client/index.js");

const prisma = new PrismaClient();

const CLERK_SECRET_KEY = process.env.CLERK_SECRET_KEY;
if (!CLERK_SECRET_KEY) {
  console.error("ERROR: CLERK_SECRET_KEY is not set");
  process.exit(1);
}

// ---------------------------------------------------------------------------
// Clerk API helper
// ---------------------------------------------------------------------------

async function fetchClerkUser(userId) {
  const res = await fetch(`https://api.clerk.com/v1/users/${userId}`, {
    headers: { Authorization: `Bearer ${CLERK_SECRET_KEY}` },
  });

  if (!res.ok) {
    const text = await res.text();
    console.error(`  [clerk] Failed to fetch ${userId}: ${res.status} ${text}`);
    return null;
  }

  return res.json();
}

// ---------------------------------------------------------------------------
// Azure ARM — provision sender email
// ---------------------------------------------------------------------------

const EMAIL_DOMAIN = "onera.app";
const SUBSCRIPTION_ID = "a6605f29-cd61-42a8-9485-11875b8a0b29";
const RESOURCE_GROUP = "onera";
const EMAIL_SERVICE_NAME = "onera-operator";
const ARM_API_VERSION = "2023-04-01";

async function getArmToken() {
  const tenantId = process.env.AZURE_TENANT_ID;
  const clientId = process.env.AZURE_CLIENT_ID;
  const clientSecret = process.env.AZURE_CLIENT_SECRET;

  if (!tenantId || !clientId || !clientSecret) {
    console.warn("  [arm] Missing Azure SP credentials — skipping email provisioning");
    return null;
  }

  const res = await fetch(
    `https://login.microsoftonline.com/${tenantId}/oauth2/v2.0/token`,
    {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        grant_type: "client_credentials",
        client_id: clientId,
        client_secret: clientSecret,
        scope: "https://management.azure.com/.default",
      }),
    }
  );

  if (!res.ok) {
    console.error("  [arm] Failed to get token:", await res.text());
    return null;
  }

  const data = await res.json();
  return data.access_token;
}

function toEmailUsername(companyName) {
  return (
    companyName
      .toLowerCase()
      .replace(/[^a-z0-9-]/g, "")
      .replace(/-+/g, "-")
      .replace(/^-|-$/g, "")
      .substring(0, 64) || "company"
  );
}

async function provisionSender(username, armToken) {
  const email = `${username}@${EMAIL_DOMAIN}`;

  const url =
    `https://management.azure.com/subscriptions/${SUBSCRIPTION_ID}` +
    `/resourceGroups/${RESOURCE_GROUP}` +
    `/providers/Microsoft.Communication/emailServices/${EMAIL_SERVICE_NAME}` +
    `/domains/${EMAIL_DOMAIN}` +
    `/senderUsernames/${username}?api-version=${ARM_API_VERSION}`;

  const res = await fetch(url, {
    method: "PUT",
    headers: {
      Authorization: `Bearer ${armToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      properties: { username, displayName: username },
    }),
  });

  if (res.ok || res.status === 409) {
    return email;
  }

  console.error(
    `  [arm] Failed to provision ${email}: ${res.status}`,
    await res.text()
  );
  return null;
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main() {
  console.log("=== Backfill: Users & Company Emails ===\n");

  // ── Step 1: Backfill user emails from Clerk ─────────────────────
  console.log("--- Step 1: Backfill user emails from Clerk ---\n");

  const users = await prisma.user.findMany({
    select: { id: true, email: true, name: true },
  });

  console.log(`Found ${users.length} user(s) in the database.\n`);

  let usersUpdated = 0;
  let usersSkipped = 0;
  let usersFailed = 0;

  for (const user of users) {
    const isFake =
      !user.email || user.email.endsWith("@onera.local") || user.email.endsWith("@onera.chat");

    if (!isFake) {
      console.log(`  [skip] ${user.id} — already has real email: ${user.email}`);
      usersSkipped++;
      continue;
    }

    console.log(`  [fetch] ${user.id} — current email: ${user.email || "(none)"}`);

    const clerkUser = await fetchClerkUser(user.id);
    if (!clerkUser) {
      usersFailed++;
      continue;
    }

    const email =
      clerkUser.email_addresses?.find(
        (e) => e.id === clerkUser.primary_email_address_id
      )?.email_address || clerkUser.email_addresses?.[0]?.email_address;

    const name = [clerkUser.first_name, clerkUser.last_name]
      .filter(Boolean)
      .join(" ") || null;

    const image = clerkUser.image_url || null;

    if (!email) {
      console.error(`  [error] ${user.id} — Clerk user has no email address`);
      usersFailed++;
      continue;
    }

    await prisma.user.update({
      where: { id: user.id },
      data: { email, name: name || undefined, image: image || undefined },
    });

    console.log(`  [updated] ${user.id} — ${user.email} → ${email} (name: ${name || "none"})`);
    usersUpdated++;
  }

  console.log(
    `\nUser backfill complete: ${usersUpdated} updated, ${usersSkipped} skipped, ${usersFailed} failed.\n`
  );

  // ── Step 2: Provision company emails for existing projects ──────
  console.log("--- Step 2: Provision company emails for projects ---\n");

  const projects = await prisma.project.findMany({
    select: { id: true, name: true, companyEmail: true, website: true },
  });

  console.log(`Found ${projects.length} project(s) in the database.\n`);

  const armToken = await getArmToken();
  let emailsProvisioned = 0;
  let emailsSkipped = 0;
  let emailsFailed = 0;

  for (const project of projects) {
    if (project.companyEmail) {
      console.log(
        `  [skip] "${project.name}" — already has: ${project.companyEmail}`
      );
      emailsSkipped++;
      continue;
    }

    if (!armToken) {
      console.log(`  [skip] "${project.name}" — no ARM token`);
      emailsFailed++;
      continue;
    }

    console.log(`  [provision] "${project.name}"...`);

    // Try base name first, then append suffix for collisions
    let email = null;
    const baseName = toEmailUsername(project.name);
    const candidates = [baseName, `${baseName}-2`, `${baseName}-3`];

    for (const candidate of candidates) {
      const candidateEmail = `${candidate}@${EMAIL_DOMAIN}`;

      // Check if this email is already taken by another project
      const existing = await prisma.project.findUnique({
        where: { companyEmail: candidateEmail },
      });
      if (existing) {
        console.log(`  [collision] ${candidateEmail} already in use by "${existing.name}" — trying next`);
        continue;
      }

      email = await provisionSender(candidate, armToken);
      if (email) break;
    }

    if (!email) {
      console.error(`  [error] Could not find unique email for "${project.name}"`);
      emailsFailed++;
      continue;
    }

    await prisma.project.update({
      where: { id: project.id },
      data: { companyEmail: email },
    });

    console.log(`  [done] "${project.name}" → ${email}`);
    emailsProvisioned++;
  }

  console.log(
    `\nEmail provisioning complete: ${emailsProvisioned} created, ${emailsSkipped} skipped, ${emailsFailed} failed.\n`
  );

  console.log("=== Backfill complete ===");
}

main()
  .catch((err) => {
    console.error("Fatal error:", err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
