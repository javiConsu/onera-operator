import type { FastifyInstance } from "fastify";
import { Checkout, Webhooks } from "@dodopayments/fastify";
import {
  activateTrial,
  addCredits,
  getBillingSummary,
  getCreditHistory,
  CREDIT_PACKS,
  AUTO_CHARGE_PACK,
  getUserByDodoCustomerId,
} from "../services/billing.service.js";
import { prisma } from "@onera/database";

// DodoPayments product IDs — set these in env or hardcode after creating products
// You'll create these products in the DodoPayments dashboard
const DODO_ENV = (process.env.DODO_PAYMENTS_ENVIRONMENT as "test_mode" | "live_mode") || "test_mode";

export async function billingRoutes(app: FastifyInstance) {
  // ─── Checkout: Start trial (add card + get 50 free credits) ────
  const trialCheckout = Checkout({
    bearerToken: process.env.DODO_PAYMENTS_API_KEY!,
    environment: DODO_ENV,
    returnUrl: process.env.DODO_PAYMENTS_RETURN_URL || `${process.env.FRONTEND_URL || "http://localhost:3000"}/dashboard?trial=activated`,
    type: "dynamic",
  });

  // Dynamic checkout: frontend POSTs with product_id + customer info
  app.post("/api/billing/checkout", trialCheckout.postHandler);

  // ─── Purchase credit pack ─────────────────────────────────────
  app.post<{
    Body: { userId: string; packSlug: string };
  }>("/api/billing/purchase", async (request, reply) => {
    const { userId, packSlug } = request.body;

    const pack = CREDIT_PACKS.find((p) => p.slug === packSlug);
    if (!pack) {
      return reply.code(400).send({ error: "Invalid pack" });
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { email: true, name: true, dodoCustomerId: true },
    });
    if (!user) {
      return reply.code(404).send({ error: "User not found" });
    }

    // Create a DodoPayments payment link for the pack
    // Frontend will redirect user to this URL
    const baseUrl = DODO_ENV === "live_mode"
      ? "https://live.dodopayments.com"
      : "https://test.dodopayments.com";

    const response = await fetch(`${baseUrl}/payments`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${process.env.DODO_PAYMENTS_API_KEY}`,
      },
      body: JSON.stringify({
        billing: { country: "US" },
        customer: {
          customer_id: user.dodoCustomerId || undefined,
          email: user.email || `${userId}@onera.chat`,
          name: user.name || "OneraOS User",
        },
        product_cart: [{ product_id: packSlug, quantity: 1 }],
        payment_link: true,
        return_url: `${process.env.FRONTEND_URL || "http://localhost:3000"}/dashboard?purchase=success&pack=${packSlug}`,
        metadata: {
          userId,
          packSlug,
          type: "credit_pack",
        },
      }),
    });

    if (!response.ok) {
      const err = await response.text();
      app.log.error({ err }, "DodoPayments checkout failed");
      return reply.code(500).send({ error: "Payment creation failed" });
    }

    const data = await response.json() as { payment_link: string };
    return reply.send({ checkoutUrl: data.payment_link });
  });

  // ─── Webhook: Handle DodoPayments events ──────────────────────
  // Encapsulate in its own plugin so the raw body parser doesn't affect other routes
  await app.register(async function webhookPlugin(webhookApp) {
    // Override JSON parser to pass raw string (needed for signature verification)
    webhookApp.addContentTypeParser(
      "application/json",
      { parseAs: "string" },
      (_req, body, done) => {
        done(null, body);
      }
    );

    webhookApp.post(
      "/api/billing/webhooks",
      Webhooks({
        webhookKey: process.env.DODO_PAYMENTS_WEBHOOK_KEY!,

        onPaymentSucceeded: async (payload) => {
          app.log.info({ payload }, "DodoPayments: payment succeeded");
          const data = payload.data as Record<string, unknown>;
          const metadata = (data.metadata || {}) as Record<string, string>;
          const paymentId = data.payment_id as string;
          const customerId = data.customer_id as string;

          if (metadata.type === "trial_activation") {
            // Trial activation — give 50 free credits
            const userId = metadata.userId;
            if (userId) {
              await activateTrial(userId, customerId);
              app.log.info({ userId }, "Trial activated with 50 credits");
            }
          } else if (metadata.type === "credit_pack") {
            // Credit pack purchase
            const userId = metadata.userId;
            const packSlug = metadata.packSlug;
            const pack = CREDIT_PACKS.find((p) => p.slug === packSlug);

            if (userId && pack) {
              await addCredits(userId, pack.credits, {
                type: "PURCHASE",
                description: `Purchased ${pack.name} pack: ${pack.credits} credits`,
                dodoPaymentId: paymentId,
                packSlug: pack.slug,
              });
              app.log.info({ userId, pack: pack.slug }, "Credits added from purchase");
            }
          } else if (metadata.type === "auto_charge") {
            // Auto-charge
            const userId = metadata.userId;
            if (userId) {
              await addCredits(userId, AUTO_CHARGE_PACK.credits, {
                type: "AUTO_CHARGE",
                description: `Auto-charged: ${AUTO_CHARGE_PACK.credits} credits ($${AUTO_CHARGE_PACK.price / 100})`,
                dodoPaymentId: paymentId,
                packSlug: AUTO_CHARGE_PACK.slug,
              });
              app.log.info({ userId }, "Auto-charge credits added");
            }
          }
        },

        onPaymentFailed: async (payload) => {
          app.log.warn({ payload }, "DodoPayments: payment failed");
        },

        onSubscriptionActive: async (payload) => {
          app.log.info({ payload }, "DodoPayments: subscription active");
        },

        onSubscriptionCancelled: async (payload) => {
          app.log.info({ payload }, "DodoPayments: subscription cancelled");
        },
      })
    );
  });

  // ─── Get billing summary ──────────────────────────────────────
  app.get<{ Params: { userId: string } }>(
    "/api/billing/:userId",
    async (request, reply) => {
      const summary = await getBillingSummary(request.params.userId);
      if (!summary) {
        return reply.code(404).send({ error: "User not found" });
      }
      return reply.send(summary);
    }
  );

  // ─── Get credit history ───────────────────────────────────────
  app.get<{ Params: { userId: string }; Querystring: { limit?: string } }>(
    "/api/billing/:userId/history",
    async (request, reply) => {
      const limit = parseInt(request.query.limit || "50", 10);
      const history = await getCreditHistory(request.params.userId, limit);
      return reply.send({ transactions: history });
    }
  );
}
