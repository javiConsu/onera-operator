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
  const [agents, recentTasks, recentLogs, stats] = await Promise.all([
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
      take: 30,
      select: {
        id: true,
        title: true,
        description: true,
        category: true,
        status: true,
        agentName: true,
        result: true,
        updatedAt: true,
        completedAt: true,
        createdAt: true,
        projectId: true,
      },
    }),

    // Recent execution logs for the terminal feed
    prisma.executionLog.findMany({
      orderBy: { createdAt: "desc" },
      take: 20,
      select: {
        id: true,
        agentName: true,
        action: true,
        status: true,
        createdAt: true,
      },
    }),

    Promise.all([
      prisma.task.count({ where: { status: TaskStatus.COMPLETED } }),
      prisma.task.count({ where: { agentName: "outreach", status: TaskStatus.COMPLETED } }),
      prisma.task.count({ where: { agentName: "twitter", status: TaskStatus.COMPLETED } }),
      prisma.project.count(),
      // Tasks completed in last 24h
      prisma.task.count({
        where: {
          status: TaskStatus.COMPLETED,
          completedAt: { gte: new Date(Date.now() - 24 * 60 * 60 * 1000) },
        },
      }),
    ]),
  ]);

  const [totalTasks, emailTasks, tweetTasks, totalProjects, tasksLast24h] = stats;

  // Extract tweets and emails from completed task results
  const tweets: { text: string; postedAt: string }[] = [];
  const emails: { subject: string; to: string; sentAt: string }[] = [];

  for (const task of recentTasks) {
    if (!task.result) continue;
    try {
      const result = JSON.parse(task.result) as Record<string, unknown>;
      const toolResults = (result.toolResults || []) as Array<{
        tool: string;
        result?: Record<string, unknown>;
      }>;

      for (const tr of toolResults) {
        if (tr.tool === "scheduleTweet" && tr.result?.tweet) {
          tweets.push({
            text: redactText(String(tr.result.tweet)),
            postedAt: String(tr.result.scheduledTime || task.completedAt?.toISOString() || task.createdAt.toISOString()),
          });
        }
        if (tr.tool === "sendEmail" && tr.result) {
          emails.push({
            subject: redactText(String(tr.result.subject || "Outreach email")),
            to: redactText(String(tr.result.to || tr.result.recipient || "unknown")),
            sentAt: String(tr.result.sentAt || task.completedAt?.toISOString() || task.createdAt.toISOString()),
          });
        }
      }
    } catch {
      // skip
    }
  }

  const safeTasks = recentTasks.map((t) => ({
    id: t.id,
    title: redactText(t.title),
    description: t.description ? redactText(t.description).slice(0, 200) : null,
    category: t.category,
    status: t.status,
    agentName: t.agentName,
    updatedAt: t.updatedAt.toISOString(),
    completedAt: t.completedAt?.toISOString() ?? null,
    createdAt: t.createdAt.toISOString(),
    projectSlug: projectSlug(t.projectId),
  }));

  // Terminal-style log lines from execution logs
  const terminalLines = recentLogs.map((log) => ({
    text: `[${log.agentName}] ${redactText(log.action)}`,
    status: log.status,
    timestamp: log.createdAt.toISOString(),
  }));

  return {
    agents,
    tasks: safeTasks,
    tweets: tweets.slice(0, 10),
    emails: emails.slice(0, 10),
    terminalLines,
    stats: {
      totalTasksCompleted: totalTasks,
      tasksLast24h,
      emailsSent: emailTasks,
      tweetsPosted: tweetTasks,
      activeProjects: totalProjects,
    },
    hasRealData: recentTasks.length > 0,
  };
}
