import type { FastifyInstance } from "fastify";
import { prisma } from "@onera/database";
import IORedis from "ioredis";

export async function healthRoutes(app: FastifyInstance) {
  app.get("/api/health", async (_request, reply) => {
    const checks: Record<string, string> = {};

    // Check database
    try {
      await prisma.$queryRaw`SELECT 1`;
      checks.database = "ok";
    } catch {
      checks.database = "error";
    }

    // Check Redis
    try {
      const redisUrl = process.env.REDIS_URL || "redis://localhost:6379";
      const redis = new IORedis(redisUrl, { lazyConnect: true });
      await redis.connect();
      await redis.ping();
      await redis.disconnect();
      checks.redis = "ok";
    } catch {
      checks.redis = "error";
    }

    const allHealthy = Object.values(checks).every((v) => v === "ok");

    return reply.code(allHealthy ? 200 : 503).send({
      status: allHealthy ? "healthy" : "degraded",
      timestamp: new Date().toISOString(),
      checks,
    });
  });
}
