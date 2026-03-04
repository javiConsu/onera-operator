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
  const [, setTick] = useState(0);

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
        {/* Column 1: Agents */}
        <div className="col-span-3 border-r border-dashed border-border overflow-y-auto scrollbar-thin p-5">
          <h3 className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-4">
            Agents
          </h3>
          {data ? <AgentRoster agents={data.agents} /> : <LoadingPulse />}
        </div>

        {/* Column 2: Activity feed */}
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
          {data ? <ActivityFeed tasks={data.tasks} /> : <LoadingPulse />}
        </div>

        {/* Column 3: Stats + CTA */}
        <div className="col-span-3 overflow-y-auto scrollbar-thin p-5 flex flex-col gap-5">
          <h3 className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">
            All-Time Stats
          </h3>
          {data ? <StatsPanel stats={data.stats} /> : <LoadingPulse />}

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
          <div key={agent.name} className="border border-dashed border-border p-3 space-y-1">
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
              {agent.lastRunAt && <span>{formatRelativeTime(agent.lastRunAt)}</span>}
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
        const catColor = CATEGORY_COLORS[task.category] ?? "text-muted-foreground border-border";
        return (
          <div
            key={task.id}
            className={`border border-dashed p-3 space-y-2 transition-colors ${
              isRunning ? "border-primary/40 bg-primary/5" : "border-border"
            }`}
          >
            <div className="flex items-start justify-between gap-2">
              <p className="text-xs font-semibold leading-snug flex-1">{task.title}</p>
              <span className={`text-[9px] font-mono uppercase px-1.5 py-0.5 border shrink-0 ${catColor}`}>
                {task.category}
              </span>
            </div>
            <div className="flex items-center gap-2 text-[10px] text-muted-foreground flex-wrap">
              {isRunning ? (
                <span className="text-primary font-semibold animate-pulse">● Running</span>
              ) : (
                <span className={task.status === "FAILED" ? "text-destructive" : ""}>
                  {task.status === "COMPLETED" ? "✓" : "✕"} {task.status.toLowerCase()}
                </span>
              )}
              {task.agentName && <span>· {task.agentName} agent</span>}
              <span>· {task.projectSlug}</span>
              <span className="ml-auto">{formatRelativeTime(task.updatedAt)}</span>
            </div>
          </div>
        );
      })}
    </div>
  );
}

function StatsPanel({ stats }: { stats: PublicLiveData["stats"] }) {
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
          <span className="text-[10px] uppercase tracking-wider text-muted-foreground">{label}</span>
          <span className="text-lg font-bold text-primary tabular-nums">{value.toLocaleString()}</span>
        </div>
      ))}
    </div>
  );
}

function LoadingPulse() {
  return (
    <div className="space-y-2">
      {[1, 2, 3].map((i) => (
        <div key={i} className="border border-dashed border-border p-4 animate-pulse">
          <div className="h-2 bg-muted rounded w-3/4 mb-2" />
          <div className="h-2 bg-muted rounded w-1/2" />
        </div>
      ))}
    </div>
  );
}
