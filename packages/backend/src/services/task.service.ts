import { prisma, TaskStatus, TweetQueueStatus, type TaskCategory, type TaskPriority } from "@onera/database";

export interface TaskFilters {
  projectId?: string;
  status?: string;
  category?: string;
  priority?: string;
  automatable?: boolean;
  agentName?: string;
}

export async function listTasks(filters: TaskFilters = {}) {
  const where: Record<string, unknown> = {};

  if (filters.projectId) where.projectId = filters.projectId;
  if (filters.status) where.status = filters.status;
  if (filters.category) where.category = filters.category;
  if (filters.priority) where.priority = filters.priority;
  if (filters.automatable !== undefined)
    where.automatable = filters.automatable;
  if (filters.agentName) where.agentName = filters.agentName;

  return prisma.task.findMany({
    where,
    orderBy: [{ priority: "asc" }, { createdAt: "desc" }],
    include: {
      project: { select: { name: true } },
    },
  });
}

export async function getTask(id: string) {
  return prisma.task.findUnique({
    where: { id },
    include: {
      project: { select: { name: true } },
      executionLogs: { orderBy: { createdAt: "desc" }, take: 20 },
    },
  });
}

export async function createTask(data: {
  projectId: string;
  title: string;
  description: string;
  category: TaskCategory;
  priority: TaskPriority;
  automatable?: boolean;
  agentName?: string;
  scheduledFor?: Date;
}) {
  return prisma.task.create({ data });
}

export async function createManyTasks(
  tasks: Array<{
    projectId: string;
    title: string;
    description: string;
    category: TaskCategory;
    priority: TaskPriority;
    automatable?: boolean;
    agentName?: string;
    credits?: number;
  }>
) {
  return prisma.task.createMany({ data: tasks });
}

export async function updateTaskStatus(
  id: string,
  status: string,
  result?: string
) {
  const data: Record<string, unknown> = { status };
  if (status === "COMPLETED") {
    data.completedAt = new Date();
  }
  if (result !== undefined) {
    data.result = result;
  }
  return prisma.task.update({ where: { id }, data });
}

export async function updateTask(
  id: string,
  data: {
    title?: string;
    description?: string;
    category?: TaskCategory;
    priority?: TaskPriority;
    status?: TaskStatus;
    automatable?: boolean;
    agentName?: string | null;
  }
) {
  const update: Record<string, unknown> = { ...data };
  if (data.status === TaskStatus.COMPLETED) {
    update.completedAt = new Date();
  }
  return prisma.task.update({ where: { id }, data: update });
}

export async function deleteTask(id: string) {
  return prisma.task.delete({ where: { id } });
}

export async function getTaskCredits(taskId: string): Promise<number> {
  const task = await prisma.task.findUnique({
    where: { id: taskId },
    select: { credits: true },
  });
  return task?.credits ?? 1;
}

export async function getPendingAutomatableTasks(projectId?: string) {
  const where: Record<string, unknown> = {
    status: TaskStatus.PENDING,
    automatable: true,
    agentName: { not: null },
  };
  if (projectId) where.projectId = projectId;

  return prisma.task.findMany({
    where,
    orderBy: [{ priority: "asc" }, { createdAt: "asc" }],
  });
}

export async function getRecentCompletedTasks(
  projectId: string,
  limit = 20
) {
  return prisma.task.findMany({
    where: {
      projectId,
      status: TaskStatus.COMPLETED,
    },
    orderBy: { completedAt: "desc" },
    take: limit,
  });
}

export async function getTaskMetrics(projectId: string) {
  const since24h = new Date(Date.now() - 24 * 60 * 60 * 1000);

  // Consolidated: groupBy replaces 4 separate count queries (completed, pending, failed, inProgress).
  // Total queries: 3 (groupBy + tweetQueue count + emailLog count) instead of 7.
  const [statusGroups, completedToday, tweetsPostedToday, emailsSentToday] = await Promise.all([
    prisma.task.groupBy({
      by: ["status"],
      where: { projectId },
      _count: { _all: true },
    }),
    prisma.task.count({
      where: {
        projectId,
        status: TaskStatus.COMPLETED,
        completedAt: { gte: since24h },
      },
    }),
    prisma.tweetQueue.count({
      where: {
        projectId,
        status: TweetQueueStatus.POSTED,
        postedAt: { gte: since24h },
      },
    }),
    prisma.emailLog.count({
      where: {
        projectId,
        status: "SENT",
        sentAt: { gte: since24h },
      },
    }),
  ]);

  const countByStatus = Object.fromEntries(
    statusGroups.map((g) => [g.status, g._count._all])
  ) as Record<string, number>;

  return {
    completed: countByStatus[TaskStatus.COMPLETED] ?? 0,
    pending: countByStatus[TaskStatus.PENDING] ?? 0,
    failed: countByStatus[TaskStatus.FAILED] ?? 0,
    inProgress: countByStatus[TaskStatus.IN_PROGRESS] ?? 0,
    completedToday,
    tweetsPostedToday,
    emailsSentToday,
  };
}
