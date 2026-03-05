import { prisma } from "@onera/database";

// ─── Credit Pack Definitions ────────────────────────────────────
export const CREDIT_PACKS = [
  { slug: "growth-500", name: "Growth", credits: 500, price: 2900 }, // $29
  { slug: "scale-2000", name: "Scale", credits: 2000, price: 7900 }, // $79
  { slug: "power-5000", name: "Power", credits: 5000, price: 14900 }, // $149
  { slug: "mega-15000", name: "Mega", credits: 15000, price: 29900 }, // $299
] as const;

export const TRIAL_CREDITS = 50;
export const TRIAL_DAYS = 5;
export const AUTO_CHARGE_PACK = CREDIT_PACKS[0]; // Growth 500 @ $29
export const MAX_TWEETS_PER_DAY_PER_PROJECT = 3;

// Credit costs per action type
export const ACTION_CREDITS: Record<string, number> = {
  twitter: 3,
  outreach: 5,
  research: 5,
  engineer: 5,
  planner: 1,
};

// ─── Trial Activation ───────────────────────────────────────────
export async function activateTrial(userId: string, dodoCustomerId: string) {
  const trialEndsAt = new Date();
  trialEndsAt.setDate(trialEndsAt.getDate() + TRIAL_DAYS);

  const user = await prisma.user.update({
    where: { id: userId },
    data: {
      credits: { increment: TRIAL_CREDITS },
      dodoCustomerId,
      trialActivated: true,
      trialEndsAt,
    },
  });

  // Record the transaction
  await prisma.creditTransaction.create({
    data: {
      userId,
      type: "TRIAL_BONUS",
      amount: TRIAL_CREDITS,
      balance: user.credits,
      description: `Trial activated: ${TRIAL_CREDITS} free credits, expires ${trialEndsAt.toISOString().split("T")[0]}`,
    },
  });

  return user;
}

// ─── Add Credits (after purchase) ───────────────────────────────
export async function addCredits(
  userId: string,
  amount: number,
  opts: {
    type: "PURCHASE" | "AUTO_CHARGE" | "REFUND" | "MANUAL";
    description: string;
    dodoPaymentId?: string;
    packSlug?: string;
  }
) {
  const user = await prisma.user.update({
    where: { id: userId },
    data: { credits: { increment: amount } },
  });

  await prisma.creditTransaction.create({
    data: {
      userId,
      type: opts.type,
      amount,
      balance: user.credits,
      description: opts.description,
      dodoPaymentId: opts.dodoPaymentId,
      packSlug: opts.packSlug,
    },
  });

  return user;
}

// ─── Deduct Credits (for a task) ────────────────────────────────
export async function deductCreditsForTask(
  userId: string,
  amount: number,
  taskId: string,
  description: string
): Promise<{ success: boolean; remainingCredits: number }> {
  // Atomic check-and-deduct
  const result = await prisma.user.updateMany({
    where: { id: userId, credits: { gte: amount } },
    data: { credits: { decrement: amount } },
  });

  if (result.count === 0) {
    // Insufficient credits — attempt auto-charge
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { credits: true, autoChargeEnabled: true, dodoCustomerId: true },
    });

    return { success: false, remainingCredits: user?.credits ?? 0 };
  }

  // Get new balance
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { credits: true },
  });
  const balance = user?.credits ?? 0;

  // Record transaction
  await prisma.creditTransaction.create({
    data: {
      userId,
      type: "TASK_DEDUCTION",
      amount: -amount,
      balance,
      description,
      taskId,
    },
  });

  return { success: true, remainingCredits: balance };
}

// ─── Auto-Charge (when credits run out) ─────────────────────────
export async function attemptAutoCharge(
  userId: string
): Promise<{ success: boolean; creditsAdded: number }> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      autoChargeEnabled: true,
      dodoCustomerId: true,
      email: true,
      name: true,
    },
  });

  if (!user?.autoChargeEnabled || !user?.dodoCustomerId) {
    return { success: false, creditsAdded: 0 };
  }

  // Create a charge via DodoPayments API
  const env = process.env.DODO_PAYMENTS_ENVIRONMENT || "test_mode";
  const baseUrl =
    env === "live_mode"
      ? "https://api.dodopayments.com"
      : "https://test.dodopayments.com";

  try {
    const response = await fetch(`${baseUrl}/payments`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${process.env.DODO_PAYMENTS_API_KEY}`,
      },
      body: JSON.stringify({
        billing: { country: "US" },
        customer: {
          customer_id: user.dodoCustomerId,
          email: user.email || `${userId}@onera.chat`,
          name: user.name || "OneraOS User",
        },
        product_cart: [
          { product_id: AUTO_CHARGE_PACK.slug, quantity: 1 },
        ],
        metadata: {
          userId,
          type: "auto_charge",
          packSlug: AUTO_CHARGE_PACK.slug,
        },
      }),
    });

    if (!response.ok) {
      console.error(
        `[billing] Auto-charge failed for user ${userId}: ${response.status} ${await response.text()}`
      );
      return { success: false, creditsAdded: 0 };
    }

    // Credits will be added when the webhook fires (onPaymentSucceeded).
    // For now, optimistically add credits so the task can proceed.
    await addCredits(userId, AUTO_CHARGE_PACK.credits, {
      type: "AUTO_CHARGE",
      description: `Auto-charged: ${AUTO_CHARGE_PACK.credits} credits ($${AUTO_CHARGE_PACK.price / 100}) — pending payment confirmation`,
      packSlug: AUTO_CHARGE_PACK.slug,
    });

    console.log(
      `[billing] Auto-charged ${AUTO_CHARGE_PACK.credits} credits for user ${userId}`
    );
    return { success: true, creditsAdded: AUTO_CHARGE_PACK.credits };
  } catch (err) {
    console.error(`[billing] Auto-charge error for user ${userId}:`, err);
    return { success: false, creditsAdded: 0 };
  }
}

// ─── Check Trial Status ─────────────────────────────────────────
export async function getTrialStatus(userId: string) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      credits: true,
      trialActivated: true,
      trialEndsAt: true,
      autoChargeEnabled: true,
      dodoCustomerId: true,
    },
  });

  if (!user) return null;

  const now = new Date();
  const trialExpired = user.trialEndsAt ? now > user.trialEndsAt : false;
  const trialActive = user.trialActivated && !trialExpired;

  return {
    credits: user.credits,
    trialActivated: user.trialActivated,
    trialActive,
    trialExpired,
    trialEndsAt: user.trialEndsAt,
    hasCard: !!user.dodoCustomerId,
    autoChargeEnabled: user.autoChargeEnabled,
  };
}

// ─── Credit Transaction History ─────────────────────────────────
export async function getCreditHistory(userId: string, limit = 50) {
  return prisma.creditTransaction.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
    take: limit,
  });
}

// ─── Tweet Rate Limiting (3/day/project) ────────────────────────
export async function getTweetCountToday(projectId: string): Promise<number> {
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);

  return prisma.task.count({
    where: {
      projectId,
      category: "TWITTER",
      status: { in: ["COMPLETED", "IN_PROGRESS"] },
      updatedAt: { gte: todayStart },
    },
  });
}

export async function canPostTweet(projectId: string): Promise<boolean> {
  const count = await getTweetCountToday(projectId);
  return count < MAX_TWEETS_PER_DAY_PER_PROJECT;
}

// ─── Resolve user from DodoPayments customer ID ─────────────────
export async function getUserByDodoCustomerId(dodoCustomerId: string) {
  return prisma.user.findUnique({
    where: { dodoCustomerId },
  });
}

// ─── Get user billing summary ───────────────────────────────────
export async function getBillingSummary(userId: string) {
  const [status, history] = await Promise.all([
    getTrialStatus(userId),
    getCreditHistory(userId, 20),
  ]);

  return {
    ...status,
    recentTransactions: history,
    packs: CREDIT_PACKS.map((p) => ({
      slug: p.slug,
      name: p.name,
      credits: p.credits,
      price: p.price / 100, // dollars
    })),
  };
}
