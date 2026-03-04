import type { FastifyInstance } from "fastify";
import { prisma } from "@onera/database";

/**
 * User routes
 *
 * NOTE: This backend is designed to run inside a Docker network and relies on
 * the Next.js frontend's Clerk middleware for authentication. All routes here
 * are accessible to any caller with network access to the backend port.
 * Do not expose the backend port directly to the public internet.
 */
export async function userRoutes(app: FastifyInstance) {
  // Get user credits by userId
  app.get<{ Params: { userId: string } }>(
    "/api/users/:userId/credits",
    async (request, reply) => {
      const { userId } = request.params;
      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { credits: true },
      });
      if (!user) {
        return reply.code(404).send({ error: "User not found" });
      }
      return reply.send({ credits: user.credits });
    }
  );
}
