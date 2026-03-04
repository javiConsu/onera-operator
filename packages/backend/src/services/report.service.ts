import { prisma } from "@onera/database";

export async function createDailyReport(data: {
  projectId: string;
  content: string;
  tasksCompleted?: string;
  tasksPlanned?: string;
  metrics?: string;
}) {
  // Calculate day number since project creation using calendar-date arithmetic
  const project = await prisma.project.findUnique({
    where: { id: data.projectId },
    select: { createdAt: true },
  });

  if (!project) {
    throw new Error(`Project not found: ${data.projectId}`);
  }

  // Compare calendar dates to avoid time-of-day sensitivity
  const createdDate = new Date(project.createdAt);
  createdDate.setHours(0, 0, 0, 0);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const diffDays = Math.floor(
    (today.getTime() - createdDate.getTime()) / (1000 * 60 * 60 * 24)
  );
  const day = Math.max(1, diffDays + 1);

  return prisma.dailyReport.create({
    data: { ...data, day },
  });
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
