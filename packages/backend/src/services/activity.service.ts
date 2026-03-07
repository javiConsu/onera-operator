import IORedis from "ioredis";
import { rewriteNarrative } from "./narrative.service.js";

// ─── Agent Activity Events ──────────────────────────────────────
// Published to Redis pub/sub for real-time streaming to the frontend.

export interface AgentEvent {
  type: "step" | "thinking" | "tool_call" | "tool_result" | "started" | "completed" | "failed" | "info";
  agentName: string;
  taskId: string;
  taskTitle: string;
  projectId: string;
  message: string;
  /** Human-readable narrative, rewritten by GPT-4.1-nano. Falls back to message. */
  narrative?: string;
  data?: unknown;
  timestamp: string;
}

const CHANNEL = "agent:activity";

let publisher: IORedis | null = null;

function getPublisher(): IORedis | null {
  if (publisher) return publisher;

  const redisUrl = process.env.REDIS_URL;
  if (!redisUrl) return null;

  const isTls = redisUrl.startsWith("rediss://");
  publisher = new IORedis(redisUrl, {
    tls: isTls ? { rejectUnauthorized: false } : undefined,
    enableReadyCheck: false,
    connectTimeout: 5000,
    maxRetriesPerRequest: 3,
    lazyConnect: true,
  });

  publisher.connect().catch((err) => {
    console.warn("[activity] Redis publisher connection failed:", err.message || err);
    publisher = null;
  });

  return publisher;
}

/**
 * Publish an agent activity event to Redis pub/sub.
 *
 * The narrative rewrite happens ONCE here before publishing, so all
 * SSE clients (authenticated + public) receive the pre-rewritten text.
 * If the rewrite fails or takes too long, the raw message is used.
 */
export function publishAgentEvent(event: Omit<AgentEvent, "timestamp" | "narrative">) {
  const pub = getPublisher();
  if (!pub) return;

  const timestamp = new Date().toISOString();

  // Fire the narrative rewrite, then publish. Don't await at the call site —
  // this is already non-blocking (publishAgentEvent returns void).
  rewriteNarrative(event.type, event.agentName, event.taskTitle, event.message)
    .then((narrative) => {
      const fullEvent: AgentEvent = {
        ...event,
        narrative,
        timestamp,
      };
      return pub.publish(CHANNEL, JSON.stringify(fullEvent));
    })
    .catch((err) => {
      // If narrative rewrite fails, publish without it
      console.warn("[activity] Narrative rewrite or Redis publish failed:", err.message || err);
      const fullEvent: AgentEvent = {
        ...event,
        timestamp,
      };
      pub.publish(CHANNEL, JSON.stringify(fullEvent)).catch(() => {});
    });
}

/** Create a Redis subscriber for agent activity events */
export function createActivitySubscriber(
  onEvent: (event: AgentEvent) => void
): { unsubscribe: () => void } {
  const redisUrl = process.env.REDIS_URL;
  if (!redisUrl) {
    return { unsubscribe: () => {} };
  }

  const isTls = redisUrl.startsWith("rediss://");
  const subscriber = new IORedis(redisUrl, {
    tls: isTls ? { rejectUnauthorized: false } : undefined,
    enableReadyCheck: false,
    connectTimeout: 5000,
    maxRetriesPerRequest: 3,
  });

  subscriber.subscribe(CHANNEL).catch((err) => {
    console.warn("[activity] Redis subscribe failed:", err.message || err);
  });

  subscriber.on("message", (_channel, message) => {
    try {
      const event = JSON.parse(message) as AgentEvent;
      onEvent(event);
    } catch {
      // ignore malformed messages
    }
  });

  return {
    unsubscribe: () => {
      subscriber.unsubscribe(CHANNEL).catch(() => {});
      subscriber.quit().catch(() => {});
    },
  };
}
