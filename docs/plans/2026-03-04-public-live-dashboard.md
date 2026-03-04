# Public Live Dashboard Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add a public `/live` page showing real-time agent activity across all users (PII-redacted) with a demo-project fallback when no real data exists.

**Architecture:** A new backend `/api/public/live` route aggregates cross-user task/agent data and applies server-side PII redaction before returning it. The frontend `/live` page polls this endpoint every 5 seconds and renders a Blueprint-styled three-column view (agents roster, activity feed, stats). Middleware adds `/live` to public routes; the landing page gets a "Watch it live →" secondary link.

**Tech Stack:** Fastify (backend route), Prisma (data queries), Next.js 15 App Router (frontend page), Clerk middleware (public route config), Blueprint UI (JetBrains Mono, dashed borders, existing component classes)

---

### Task 1: Backend — public live data service

**Files:**
- Create: `packages/backend/src/services/public.service.ts`

This service contains all PII redaction logic and the data-aggregation query. It is the single source of truth for what gets exposed publicly.

**Step 1: Create the file**

```typescript
// packages/backend/src/services/public.service.ts
import { prisma } from "@onera/database";

/** Redact PII from a free-text string. */
export function redactText(text: string): string {
  return text
    // email addresses → a***@***.com
    .replace(/[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}/g, (m) => {
      const [local, domain] = m.split("@");
      const tld = domain!.split(".").pop();
      return `${local![0]}***@***.${tld}`;
    })
    // Twitter handles → @***
    .replace(/@[A-Za-z0-9_]{1,15}/g, "@***")
    // phone-like digit clusters → ***
    .replace(/\b\d{3}[\s.\-]?\d{3}[\s.\-]?\d{4}\b/g, "***-***-****")
    // URLs — keep scheme+domain, mask path
    .replace(
      /https?:\/\/([a-zA-Z0-9.\-]+)(\/[^\s"')]*)?/g,
      (_m, host: string) => `https://${host}/…`
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
  // Simple hash of the ID string
  let hash = 0;
  for (const ch of projectId) hash = (hash * 31 + ch.charCodeAt(0)) >>> 0;
  const adj = adjectives[hash % adjectives.length]!;
  const noun = nouns[Math.floor(hash / adjectives.length) % nouns.length]!;
  return `${adj}-${noun}`;
}

export async function getPublicLiveData() {
  const [agents, recentTasks, stats] = await Promise.all([
    // All agent statuses — no user/project data here
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

    // 20 most recent tasks across all projects, running or completed
    prisma.task.findMany({
      where: {
        status: { in: ["IN_PROGRESS", "COMPLETED", "FAILED"] },
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

    // Aggregate stats
    Promise.all([
      prisma.task.count({ where: { status: "COMPLETED" } }),
      prisma.task.count({ where: { agentName: "outreach", status: "COMPLETED" } }),
      prisma.task.count({ where: { agentName: "twitter", status: "COMPLETED" } }),
      prisma.project.count(),
    ]),
  ]);

  const [totalTasks, emailTasks, tweetTasks, totalProjects] = stats;

  // Redact task titles and replace project IDs with slugs
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
```

**Step 2: Verify TypeScript compiles**

```bash
pnpm --filter @onera/backend exec tsc --noEmit
```

Expected: no errors.

**Step 3: Commit**

```bash
git add packages/backend/src/services/public.service.ts
git commit -m "feat: public live data service with PII redaction"
```

---

### Task 2: Backend — public API route

**Files:**
- Create: `packages/backend/src/routes/public.ts`
- Modify: `packages/backend/src/server.ts`

**Step 1: Create the route file**

```typescript
// packages/backend/src/routes/public.ts
import type { FastifyInstance } from "fastify";
import { getPublicLiveData } from "../services/public.service.js";

export async function publicRoutes(app: FastifyInstance) {
  // No auth required — returns PII-redacted live data
  app.get("/api/public/live", async (_request, reply) => {
    const data = await getPublicLiveData();
    // Allow any origin for this public endpoint
    reply.header("Access-Control-Allow-Origin", "*");
    return reply.send(data);
  });
}
```

**Step 2: Register the route in server.ts**

In `packages/backend/src/server.ts`, add the import and registration. The existing imports block looks like:

```typescript
import { userRoutes } from "./routes/users.js";
```

Add after it:

```typescript
import { publicRoutes } from "./routes/public.js";
```

And in the `// Register routes` block, add after `await app.register(userRoutes);`:

```typescript
await app.register(publicRoutes);
```

**Step 3: Verify TypeScript compiles**

```bash
pnpm --filter @onera/backend exec tsc --noEmit
```

Expected: no errors.

**Step 4: Commit**

```bash
git add packages/backend/src/routes/public.ts packages/backend/src/server.ts
git commit -m "feat: /api/public/live route — no auth, PII-redacted"
```

---

### Task 3: Frontend middleware — add /live to public routes

**Files:**
- Modify: `packages/frontend/src/middleware.ts`

The current public routes matcher is:

```typescript
const isPublicRoute = createRouteMatcher([
  "/",
  "/home",
  "/login(.*)",
  "/sign-in(.*)",
  "/sign-up(.*)",
]);
```

**Step 1: Add `/live` to the matcher**

```typescript
const isPublicRoute = createRouteMatcher([
  "/",
  "/home",
  "/live",
  "/login(.*)",
  "/sign-in(.*)",
  "/sign-up(.*)",
]);
```

**Step 2: Verify TypeScript compiles**

```bash
pnpm --filter @onera/frontend exec tsc --noEmit
```

**Step 3: Commit**

```bash
git add packages/frontend/src/middleware.ts
git commit -m "feat: add /live to public routes (no auth required)"
```

---

### Task 4: Frontend — shared type for public live data

**Files:**
- Modify: `packages/frontend/src/lib/api-client.ts`

Add these types at the bottom of `api-client.ts` and a `publicApi` object:

```typescript
// ─── Public live dashboard types ─────────────────────────────────────────────

export interface PublicAgentStatus {
  name: string;
  displayName: string;
  status: string;
  lastRunAt: string | null;
  tasksCompleted: number;
}

export interface PublicTask {
  id: string;
  title: string;
  category: string;
  status: string;
  agentName: string | null;
  updatedAt: string;
  completedAt: string | null;
  projectSlug: string;
}

export interface PublicLiveData {
  agents: PublicAgentStatus[];
  tasks: PublicTask[];
  stats: {
    totalTasksCompleted: number;
    emailsSent: number;
    tweetsPosted: number;
    activeProjects: number;
  };
  hasRealData: boolean;
}

export const publicApi = {
  live: () => fetchApi<PublicLiveData>("/api/public/live"),
};
```

**Step 1: Add to api-client.ts** (append to the bottom of the file).

**Step 2: Verify TypeScript compiles**

```bash
pnpm --filter @onera/frontend exec tsc --noEmit
```

**Step 3: Commit**

```bash
git add packages/frontend/src/lib/api-client.ts
git commit -m "feat: add PublicLiveData types and publicApi.live() to api-client"
```

---

### Task 5: Frontend — /live page

**Files:**
- Create: `packages/frontend/src/app/live/page.tsx`

This is a `"use client"` page that polls `/api/public/live` every 5 seconds and renders three columns in Blueprint UI style.

```typescript
"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import {
  publicApi,
  type PublicLiveData,
  type PublicAgentStatus,
  type PublicTask,
} from "@/lib/api-client";
import { formatRelativeTime } from "@/lib/utils";

export default function LivePage() {
  const [data, setData] = useState<PublicLiveData | null>(null);
  const [tick, setTick] = useState(0); // forces re-render for relative times

  const fetchData = useCallback(async () => {
    try {
      const result = await publicApi.live();
      setData(result);
    } catch {
      // silently ignore — keep showing last data
    }
  }, []);

  useEffect(() => {
    fetchData();
    const dataInterval = setInterval(fetchData, 5000);
    const tickInterval = setInterval(() => setTick((t) => t + 1), 1000);
    return () => {
      clearInterval(dataInterval);
      clearInterval(tickInterval);
    };
  }, [fetchData]);

  return (
    <div className="flex min-h-screen flex-col bg-background">
      {/* Terminal bar */}
      <div className="terminal-bar px-6 py-2 flex items-center gap-3 overflow-hidden">
        <span className="text-primary animate-pulse shrink-0">●</span>
        <span className="text-xs truncate">
          {data
            ? `${data.agents.filter((a) => a.status === "running").length} agents running · ${data.stats.totalTasksCompleted} tasks completed all-time`
            : "Connecting to live feed..."}
        </span>
        <span className="animate-blink ml-auto shrink-0">_</span>
      </div>

      {/* Header */}
      <header className="border-b border-dashed border-border bg-background">
        <div className="flex h-12 items-center justify-between px-6">
          <Link href="/home" className="text-xl font-bold tracking-tight text-primary">
            OneraOS
          </Link>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full bg-primary animate-pulse" />
              <span className="text-[10px] uppercase tracking-wider text-primary font-bold">
                Live
              </span>
            </div>
            <Link href="/login">
              <Button size="sm">Start yours &rarr;</Button>
            </Link>
          </div>
        </div>
      </header>

      {/* Main three-column layout */}
      <div className="flex-1 grid grid-cols-12 overflow-hidden">
        {/* Column 1: Agents (3 cols) */}
        <div className="col-span-3 border-r border-dashed border-border overflow-y-auto scrollbar-thin p-5">
          <h3 className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-4">
            Agents
          </h3>
          {data ? (
            <AgentRoster agents={data.agents} />
          ) : (
            <LoadingPulse />
          )}
        </div>

        {/* Column 2: Activity feed (6 cols) */}
        <div className="col-span-6 border-r border-dashed border-border overflow-y-auto scrollbar-thin p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">
              Live Activity
            </h3>
            {data && (
              <span className="text-[10px] text-muted-foreground">
                {data.hasRealData ? "real data · redacted" : "demo data"}
              </span>
            )}
          </div>
          {data ? (
            <ActivityFeed tasks={data.tasks} />
          ) : (
            <LoadingPulse />
          )}
        </div>

        {/* Column 3: Stats + CTA (3 cols) */}
        <div className="col-span-3 overflow-y-auto scrollbar-thin p-5 flex flex-col gap-5">
          <h3 className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">
            All-Time Stats
          </h3>
          {data ? (
            <StatsPanel stats={data.stats} />
          ) : (
            <LoadingPulse />
          )}

          {/* CTA */}
          <div className="border border-dashed border-border p-5 mt-auto">
            <p className="text-xs font-bold text-primary mb-1">
              Your own AI operator.
            </p>
            <p className="text-[10px] text-muted-foreground mb-4">
              100 free credits. No credit card. Starts working in minutes.
            </p>
            <Link href="/login">
              <Button size="sm" className="w-full">
                Get Started &rarr;
              </Button>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

function AgentRoster({ agents }: { agents: PublicAgentStatus[] }) {
  return (
    <div className="space-y-2">
      {agents.map((agent) => {
        const isRunning = agent.status === "running";
        const isError = agent.status === "error";
        return (
          <div
            key={agent.name}
            className="border border-dashed border-border p-3 space-y-1"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span
                  className={`text-xs shrink-0 ${
                    isRunning
                      ? "text-primary animate-pulse"
                      : isError
                        ? "text-destructive"
                        : "text-muted-foreground"
                  }`}
                >
                  {isRunning ? "●" : isError ? "✕" : "○"}
                </span>
                <span
                  className={`text-xs font-semibold ${
                    isRunning ? "text-foreground" : "text-muted-foreground"
                  }`}
                >
                  {agent.displayName}
                </span>
              </div>
              <span
                className={`text-[9px] font-mono uppercase px-1.5 py-0.5 border ${
                  isRunning
                    ? "border-primary/40 text-primary bg-primary/5"
                    : isError
                      ? "border-destructive/40 text-destructive"
                      : "border-border text-muted-foreground"
                }`}
              >
                {agent.status}
              </span>
            </div>
            <div className="flex items-center justify-between text-[10px] text-muted-foreground">
              <span>{agent.tasksCompleted} tasks done</span>
              {agent.lastRunAt && (
                <span>{formatRelativeTime(agent.lastRunAt)}</span>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

const CATEGORY_COLORS: Record<string, string> = {
  TWITTER: "text-sky-500 border-sky-500/30 bg-sky-500/5",
  OUTREACH: "text-violet-500 border-violet-500/30 bg-violet-500/5",
  RESEARCH: "text-amber-500 border-amber-500/30 bg-amber-500/5",
  ENGINEERING: "text-emerald-500 border-emerald-500/30 bg-emerald-500/5",
  GROWTH: "text-primary border-primary/30 bg-primary/5",
  MARKETING: "text-pink-500 border-pink-500/30 bg-pink-500/5",
  ANALYTICS: "text-orange-500 border-orange-500/30 bg-orange-500/5",
  OPERATIONS: "text-muted-foreground border-border",
  PRODUCT: "text-blue-500 border-blue-500/30 bg-blue-500/5",
};

function ActivityFeed({ tasks }: { tasks: PublicTask[] }) {
  if (tasks.length === 0) {
    return (
      <div className="border border-dashed border-border p-8 text-center">
        <p className="text-xs text-muted-foreground">
          No recent activity. Agents are warming up...
        </p>
        <span className="text-[10px] text-primary animate-pulse block mt-2">
          Waiting for tasks
        </span>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {tasks.map((task) => {
        const isRunning = task.status === "IN_PROGRESS";
        const catColor =
          CATEGORY_COLORS[task.category] ?? "text-muted-foreground border-border";
        return (
          <div
            key={task.id}
            className={`border border-dashed p-3 space-y-2 transition-colors ${
              isRunning ? "border-primary/40 bg-primary/5" : "border-border"
            }`}
          >
            <div className="flex items-start justify-between gap-2">
              <p className="text-xs font-semibold leading-snug flex-1">
                {task.title}
              </p>
              <span
                className={`text-[9px] font-mono uppercase px-1.5 py-0.5 border shrink-0 ${catColor}`}
              >
                {task.category}
              </span>
            </div>
            <div className="flex items-center gap-2 text-[10px] text-muted-foreground flex-wrap">
              {isRunning ? (
                <span className="text-primary font-semibold animate-pulse">
                  ● Running
                </span>
              ) : (
                <span
                  className={
                    task.status === "FAILED" ? "text-destructive" : ""
                  }
                >
                  {task.status === "COMPLETED" ? "✓" : "✕"}{" "}
                  {task.status.toLowerCase()}
                </span>
              )}
              {task.agentName && <span>· {task.agentName} agent</span>}
              <span>· {task.projectSlug}</span>
              <span className="ml-auto">
                {formatRelativeTime(task.updatedAt)}
              </span>
            </div>
          </div>
        );
      })}
    </div>
  );
}

function StatsPanel({
  stats,
}: {
  stats: PublicLiveData["stats"];
}) {
  return (
    <div className="space-y-3">
      {(
        [
          ["Tasks Completed", stats.totalTasksCompleted],
          ["Emails Sent", stats.emailsSent],
          ["Tweets Posted", stats.tweetsPosted],
          ["Active Projects", stats.activeProjects],
        ] as [string, number][]
      ).map(([label, value]) => (
        <div
          key={label}
          className="border border-dashed border-border p-3 flex items-center justify-between"
        >
          <span className="text-[10px] uppercase tracking-wider text-muted-foreground">
            {label}
          </span>
          <span className="text-lg font-bold text-primary tabular-nums">
            {value.toLocaleString()}
          </span>
        </div>
      ))}
    </div>
  );
}

function LoadingPulse() {
  return (
    <div className="space-y-2">
      {[1, 2, 3].map((i) => (
        <div
          key={i}
          className="border border-dashed border-border p-4 animate-pulse"
        >
          <div className="h-2 bg-muted rounded w-3/4 mb-2" />
          <div className="h-2 bg-muted rounded w-1/2" />
        </div>
      ))}
    </div>
  );
}
```

**Step 1: Create the file** with the full content above.

**Step 2: Verify TypeScript compiles**

```bash
pnpm --filter @onera/frontend exec tsc --noEmit
```

Expected: no errors.

**Step 3: Commit**

```bash
git add packages/frontend/src/app/live/page.tsx
git commit -m "feat: /live public dashboard — agents, activity feed, stats"
```

---

### Task 6: Landing page — add "Watch it live →" link

**Files:**
- Modify: `packages/frontend/src/app/home/page.tsx`

The current CTA block (added in a previous session) is:

```tsx
<div className="mt-10 flex items-center gap-4">
  <Button asChild size="lg">
    <Link href="/login">Get Started &rarr;</Link>
  </Button>
  <Link
    href="/dashboard"
    className="text-xs text-muted-foreground hover:text-primary transition-colors underline underline-offset-4"
  >
    View Dashboard &rsaquo;
  </Link>
</div>
<p className="mt-3 text-[10px] text-muted-foreground">
  No credit card &middot; 100 free credits
</p>
```

**Step 1: Replace the "View Dashboard" link with "Watch it live →"**

```tsx
<div className="mt-10 flex items-center gap-4">
  <Button asChild size="lg">
    <Link href="/login">Get Started &rarr;</Link>
  </Button>
  <Link
    href="/live"
    className="text-xs text-muted-foreground hover:text-primary transition-colors underline underline-offset-4"
  >
    Watch it live &rsaquo;
  </Link>
</div>
<p className="mt-3 text-[10px] text-muted-foreground">
  No credit card &middot; 100 free credits
</p>
```

**Step 2: Verify TypeScript compiles**

```bash
pnpm --filter @onera/frontend exec tsc --noEmit
```

**Step 3: Commit**

```bash
git add packages/frontend/src/app/home/page.tsx
git commit -m "feat: replace 'View Dashboard' landing link with 'Watch it live'"
```

---

### Task 7: Final type check and review

**Step 1: Run all type checks**

```bash
pnpm db:generate
pnpm --filter @onera/backend exec tsc --noEmit
pnpm --filter @onera/frontend exec tsc --noEmit
```

Expected: all pass with no errors.

**Step 2: Manual smoke test checklist**

- [ ] `GET /api/public/live` returns JSON with `agents`, `tasks`, `stats`, `hasRealData`
- [ ] Email addresses in task titles are replaced with `a***@***.com`
- [ ] `@handles` in task titles become `@***`
- [ ] `projectSlug` is stable (same project ID always produces same slug)
- [ ] `/live` loads without auth (open incognito / logged-out browser)
- [ ] Page auto-refreshes every 5s (watch network tab)
- [ ] "Start yours →" links to `/login`
- [ ] Landing page "Watch it live" links to `/live`

**Step 3: Final commit (if anything needed)**

```bash
git add -A
git commit -m "fix: address any issues from smoke test"
```
