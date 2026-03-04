import { prisma, TaskStatus } from "@onera/database";

/** Redact PII from a free-text string. */
export function redactText(text: string): string {
  return text
    .replace(/[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}/g, (m) => {
      const [local, domain] = m.split("@");
      const tld = domain!.split(".").pop();
      return `${local![0]}***@***.${tld}`;
    })
    .replace(/@[A-Za-z0-9_]{1,15}/g, "@***")
    .replace(/\b\d{3}[\s.\-]?\d{3}[\s.\-]?\d{4}\b/g, "***-***-****")
    .replace(
      /https?:\/\/([a-zA-Z0-9.\-]+)(\/[^\s"')]*)?/g,
      (_m, host: string) => `https://${host}/\u2026`
    );
}

/** Deterministic human-readable slug for a project ID (stable, non-reversible). */
export function projectSlug(projectId: string): string {
  const adjectives = [
    "swift", "bright", "bold", "calm", "deep", "fast", "keen",
    "lean", "neat", "pure", "sharp", "smart", "warm", "wise",
  ];
  const nouns = [
    "falcon", "orbit", "nexus", "forge", "spark", "pulse", "wave",
    "ridge", "grove", "prism", "flare", "haven", "shift", "bloom",
  ];
  let hash = 0;
  for (const ch of projectId) hash = (hash * 31 + ch.charCodeAt(0)) >>> 0;
  const adj = adjectives[hash % adjectives.length]!;
  const noun = nouns[Math.floor(hash / adjectives.length) % nouns.length]!;
  return `${adj}-${noun}`;
}

export async function getPublicLiveData() {
  const [agents, recentTasks, stats] = await Promise.all([
    prisma.agentStatus.findMany({
      orderBy: { name: "asc" },
      select: {
        name: true,
        displayName: true,
        status: true,
        lastRunAt: true,
        tasksCompleted: true,
      },
    }),
    prisma.task.findMany({
      where: {
        status: { in: [TaskStatus.IN_PROGRESS, TaskStatus.COMPLETED, TaskStatus.FAILED] },
      },
      orderBy: { updatedAt: "desc" },
      take: 20,
      select: {
        id: true,
        title: true,
        category: true,
        status: true,
        agentName: true,
        updatedAt: true,
        completedAt: true,
        projectId: true,
      },
    }),
    Promise.all([
      prisma.task.count({ where: { status: TaskStatus.COMPLETED } }),
      prisma.task.count({ where: { agentName: "outreach", status: TaskStatus.COMPLETED } }),
      prisma.task.count({ where: { agentName: "twitter", status: TaskStatus.COMPLETED } }),
      prisma.project.count(),
    ]),
  ]);

  const [totalTasks, emailTasks, tweetTasks, totalProjects] = stats;

  const safeTasks = recentTasks.map((t) => ({
    id: t.id,
    title: redactText(t.title),
    category: t.category,
    status: t.status,
    agentName: t.agentName,
    updatedAt: t.updatedAt.toISOString(),
    completedAt: t.completedAt?.toISOString() ?? null,
    projectSlug: projectSlug(t.projectId),
  }));

  return {
    agents,
    tasks: safeTasks,
    stats: {
      totalTasksCompleted: totalTasks,
      emailsSent: emailTasks,
      tweetsPosted: tweetTasks,
      activeProjects: totalProjects,
    },
    hasRealData: recentTasks.length > 0,
  };
}
