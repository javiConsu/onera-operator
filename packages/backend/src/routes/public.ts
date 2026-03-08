import type { FastifyInstance } from "fastify";
import {
  getPublicLiveData,
  answerPublicQuestion,
  checkAskRateLimit,
} from "../services/public.service.js";
import {
  createActivitySubscriber,
  publishAgentEvent,
} from "../services/activity.service.js";
import { getRecentExecutionLogs } from "../services/execution.service.js";
import { prisma } from "@onera/database";

export async function publicRoutes(app: FastifyInstance) {
  // CORS preflight for POST /api/public/ask
  app.options("/api/public/ask", async (_request, reply) => {
    reply
      .header("Access-Control-Allow-Origin", "*")
      .header("Access-Control-Allow-Methods", "POST, OPTIONS")
      .header("Access-Control-Allow-Headers", "Content-Type")
      .status(204)
      .send();
  });

  app.get("/api/public/live", async (_request, reply) => {
    const data = await getPublicLiveData();
    reply.header("Access-Control-Allow-Origin", "*");
    return reply.send(data);
  });

  // ── Public SSE stream — real-time agent activity (no auth) ──────
  // Replays recent historical events on connect so first-time visitors
  // always see activity, even if no agents are running right now.
  app.get("/api/public/stream", async (request, reply) => {
    reply.raw.writeHead(200, {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
      "Access-Control-Allow-Origin": "*",
    });

    reply.raw.write(": connected\n\n");

    // ── Historical replay (redacted) so the feed is never empty ──
    try {
      const recentLogs = await getRecentExecutionLogs(10);
      const runningTasks = await prisma.task.findMany({
        where: { status: "IN_PROGRESS" },
        select: { id: true, title: true, agentName: true, updatedAt: true },
        take: 5,
      });

      // Replay recent completed/failed logs (oldest first)
      for (const log of recentLogs.slice().reverse()) {
        const task = (log as { task?: { title?: string } }).task;
        const replayEvent = {
          type: log.status === "success" ? "completed" : "failed",
          agentName: log.agentName,
          taskTitle: task?.title || "task",
          message: log.action,
          narrative: log.action,
          timestamp: log.createdAt.toISOString(),
        };
        reply.raw.write(`data: ${JSON.stringify(replayEvent)}\n\n`);
      }

      // Show currently running tasks
      for (const task of runningTasks) {
        const runningEvent = {
          type: "started",
          agentName: task.agentName || "unknown",
          taskTitle: task.title,
          message: `${task.agentName || "Agent"} running: ${task.title}`,
          narrative: `${task.agentName || "Agent"} is working on: ${task.title}`,
          timestamp: task.updatedAt.toISOString(),
        };
        reply.raw.write(`data: ${JSON.stringify(runningEvent)}\n\n`);
      }
    } catch {
      // Replay is best-effort — don't break the stream
    }

    const { unsubscribe } = createActivitySubscriber((event) => {
      // Redact sensitive data for public consumption
      const publicEvent = {
        type: event.type,
        agentName: event.agentName,
        taskTitle: event.taskTitle,
        message: event.message,
        narrative: event.narrative || event.message,
        timestamp: event.timestamp,
      };
      reply.raw.write(`data: ${JSON.stringify(publicEvent)}\n\n`);
    });

    const keepalive = setInterval(() => {
      reply.raw.write(": keepalive\n\n");
    }, 15000);

    request.raw.on("close", () => {
      clearInterval(keepalive);
      unsubscribe();
    });
  });

  // ── Debug: emit a test event to verify SSE pipeline ──────────────
  // POST /api/public/test-event — fires a synthetic agent event through Redis.
  // Use: curl -X POST http://localhost:3001/api/public/test-event
  app.post("/api/public/test-event", async (_request, reply) => {
    reply.header("Access-Control-Allow-Origin", "*");
    try {
      publishAgentEvent({
        type: "info",
        agentName: "system",
        taskId: "test-" + Date.now(),
        taskTitle: "Pipeline Test",
        projectId: "test",
        message: `Test event at ${new Date().toLocaleTimeString()} — if you see this in the live feed, Redis pub/sub is working.`,
      });
      return reply.send({ ok: true, message: "Test event published to Redis" });
    } catch (err: any) {
      return reply.status(500).send({ ok: false, error: err.message || String(err) });
    }
  });

  app.post("/api/public/ask", async (request, reply) => {
    reply.header("Access-Control-Allow-Origin", "*");

    // Rate limit: 5 requests/min per IP
    const ip = request.ip || "unknown";
    if (!checkAskRateLimit(ip)) {
      return reply.status(429).send({
        error: "Too many questions — please wait a moment before asking again.",
      });
    }

    const body = request.body as { question?: string } | undefined;
    const question = body?.question?.trim();
    if (!question || question.length < 2 || question.length > 500) {
      return reply.status(400).send({
        error: "Please provide a question (2–500 characters).",
      });
    }

    try {
      const answer = await answerPublicQuestion(question);
      return reply.send({ answer });
    } catch (err) {
      request.log.error(err, "public ask error");
      return reply.status(500).send({
        error: "Sorry, I couldn't process that right now. Try again in a moment.",
      });
    }
  });
}
