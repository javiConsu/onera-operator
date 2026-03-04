import type { FastifyInstance } from "fastify";
import { getSchedulerQueue, getReportQueue } from "../queue/scheduler.queue.js";

export async function loopRoutes(app: FastifyInstance) {
  // Manually trigger one agent loop cycle
  app.post<{ Body: { projectId?: string } }>(
    "/api/loop/trigger",
    async (request, reply) => {
      const { projectId } = request.body || {};
      const queue = getSchedulerQueue();

      await queue.add("manual-agent-loop", {
        type: "agent-loop",
        projectId,
      });

      return reply.send({
        message: "Agent loop triggered",
        projectId: projectId || "all projects",
      });
    }
  );

  // Manually trigger a daily report
  app.post<{ Body: { projectId?: string } }>(
    "/api/reports/generate",
    async (request, reply) => {
      const { projectId } = request.body || {};
      const queue = getReportQueue();

      await queue.add("manual-daily-report", {
        type: "daily-report",
        projectId,
      });

      return reply.send({
        message: "Daily report generation triggered",
        projectId: projectId || "all projects",
      });
    }
  );
}
