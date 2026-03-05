import Fastify from "fastify";
import cors from "@fastify/cors";

import { healthRoutes } from "./routes/health.js";
import { projectRoutes } from "./routes/projects.js";
import { taskRoutes } from "./routes/tasks.js";
import { agentRoutes } from "./routes/agents.js";
import { reportRoutes } from "./routes/reports.js";
import { chatRoutes } from "./routes/chat.js";
import { loopRoutes } from "./routes/loop.js";
import { userRoutes } from "./routes/users.js";
import { publicRoutes } from "./routes/public.js";
import { billingRoutes } from "./routes/billing.js";

export async function buildServer() {
  const app = Fastify({
    logger: {
      level: process.env.LOG_LEVEL || "info",
    },
  });

  // CORS for frontend
  await app.register(cors, {
    origin: process.env.FRONTEND_URL || "http://localhost:3000",
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
  });

  // Register routes
  await app.register(healthRoutes);
  await app.register(projectRoutes);
  await app.register(taskRoutes);
  await app.register(agentRoutes);
  await app.register(reportRoutes);
  await app.register(chatRoutes);
  await app.register(loopRoutes);
  await app.register(userRoutes);
  await app.register(publicRoutes);
  await app.register(billingRoutes);

  return app;
}
