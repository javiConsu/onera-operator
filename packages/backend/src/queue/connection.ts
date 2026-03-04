import { type ConnectionOptions } from "bullmq";
import IORedis from "ioredis";

let connection: IORedis | null = null;
let connectionFailed = false;

export function isRedisAvailable(): boolean {
  return !connectionFailed && connection !== null;
}

export function getRedisConnection(): ConnectionOptions {
  if (!connection) {
    const redisUrl = process.env.REDIS_URL || "redis://localhost:6379";
    const isTls = redisUrl.startsWith("rediss://");

    connection = new IORedis(redisUrl, {
      maxRetriesPerRequest: null, // Required by BullMQ
      tls: isTls ? { rejectUnauthorized: false } : undefined,
      enableReadyCheck: false,
      connectTimeout: 10000,
      retryStrategy(times) {
        if (times > 5) {
          console.warn(
            `[onera-queue] Redis connection failed after ${times} retries. Giving up.`
          );
          connectionFailed = true;
          return null; // Stop retrying
        }
        return Math.min(times * 500, 3000);
      },
    });

    connection.on("error", (err) => {
      // Only log once, not on every retry
      if (!connectionFailed) {
        console.error("[onera-queue] Redis error:", err.message);
      }
    });

    connection.on("connect", () => {
      connectionFailed = false;
      console.log("[onera-queue] Redis connected");
    });
  }

  return connection as unknown as ConnectionOptions;
}

export async function closeRedisConnection(): Promise<void> {
  if (connection) {
    await connection.quit();
    connection = null;
  }
}
