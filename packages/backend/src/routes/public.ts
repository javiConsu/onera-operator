import type { FastifyInstance } from "fastify";
import { getPublicLiveData } from "../services/public.service.js";

export async function publicRoutes(app: FastifyInstance) {
  app.get("/api/public/live", async (_request, reply) => {
    const data = await getPublicLiveData();
    reply.header("Access-Control-Allow-Origin", "*");
    return reply.send(data);
  });
}
