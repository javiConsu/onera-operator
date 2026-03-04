import { prisma } from "@onera/database";

export async function createDailyReport(data: {
  projectId: string;
  content: string;
  tasksCompleted?: string;
  tasksPlanned?: string;
  metrics?: string;
}) {
  return prisma.dailyReport.create({ data });
}

export async function getLatestReport(projectId: string) {
  return prisma.dailyReport.findFirst({
    where: { projectId },
    orderBy: { date: "desc" },
  });
}

export async function listReports(projectId: string, limit = 30) {
  return prisma.dailyReport.findMany({
    where: { projectId },
    orderBy: { date: "desc" },
    take: limit,
  });
}
