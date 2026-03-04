"use client";

import { useEffect, useState, useCallback } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { api, type TaskMetrics } from "@/lib/api-client";
import { formatRelativeTime } from "@/lib/utils";

interface CompanyPanelProps {
  projectName: string;
  projectId?: string;
  credits: number;
}

export function CompanyPanel({
  projectName,
  projectId,
  credits,
}: CompanyPanelProps) {
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date());
  const [metrics, setMetrics] = useState<TaskMetrics | null>(null);

  const fetchMetrics = useCallback(async () => {
    if (!projectId) return;
    try {
      const data = await api.tasks.metrics(projectId);
      setMetrics(data);
      setLastUpdated(new Date());
    } catch {
      // ignore
    }
  }, [projectId]);

  useEffect(() => {
    fetchMetrics();
    const interval = setInterval(fetchMetrics, 5000);
    return () => clearInterval(interval);
  }, [fetchMetrics]);

  const isWorking =
    metrics && (metrics.inProgress > 0 || metrics.pending > 0);
  const status = metrics?.inProgress
    ? "Working"
    : metrics?.pending
      ? "Planning"
      : "Active";

  return (
    <div className="space-y-5">
      {/* Company name */}
      <div>
        <h2 className="text-lg font-bold text-primary tracking-tight">
          {projectName}
        </h2>
      </div>

      {/* Status indicator */}
      <div className="border border-dashed border-border p-4">
        <div className="flex items-center gap-3">
          {/* ASCII art bot face */}
          <div className="text-primary text-xs leading-none whitespace-pre font-bold">
            {`| ^  ^ |
| -__- |
|______|`}
          </div>
          <div>
            <Badge
              variant={isWorking ? "default" : "success"}
            >
              {status}
            </Badge>
            <p className="text-[10px] text-muted-foreground mt-1 uppercase tracking-wider">
              {metrics?.inProgress
                ? `Running ${metrics.inProgress} task${metrics.inProgress > 1 ? "s" : ""}`
                : metrics?.pending
                  ? `${metrics.pending} task${metrics.pending > 1 ? "s" : ""} queued`
                  : "Ready to execute"}
            </p>
          </div>
        </div>
      </div>

      {/* Credits */}
      <div className="border border-dashed border-border p-3">
        <div className="flex items-center justify-between">
          <span className="text-[10px] uppercase tracking-wider text-muted-foreground">
            Credits
          </span>
          <span className="text-lg font-bold text-primary">{credits}</span>
        </div>
      </div>

      {/* Separator */}
      <div className="border-t border-dashed border-border" />

      {/* Task metrics */}
      {metrics && (
        <div>
          <h4 className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold mb-3">
            Operations
          </h4>
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="text-muted-foreground">Completed</span>
              <span className="font-bold text-primary">
                {metrics.completed}
              </span>
            </div>
            <div className="flex items-center justify-between text-xs">
              <span className="text-muted-foreground">In Progress</span>
              <span className="font-bold text-primary">
                {metrics.inProgress}
              </span>
            </div>
            <div className="flex items-center justify-between text-xs">
              <span className="text-muted-foreground">Pending</span>
              <span className="font-bold text-primary">{metrics.pending}</span>
            </div>
            {metrics.failed > 0 && (
              <div className="flex items-center justify-between text-xs">
                <span className="text-muted-foreground">Failed</span>
                <span className="font-bold text-destructive">
                  {metrics.failed}
                </span>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Separator */}
      <div className="border-t border-dashed border-border" />

      {/* Business metrics placeholder */}
      <div>
        <h4 className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold mb-3">
          Business
        </h4>
        <div className="space-y-2">
          <div className="flex items-center justify-between text-xs">
            <span className="text-muted-foreground">Visitors</span>
            <span className="font-bold text-primary">0</span>
          </div>
          <div className="flex items-center justify-between text-xs">
            <span className="text-muted-foreground">Revenue</span>
            <span className="font-bold text-primary">$0.00</span>
          </div>
        </div>
      </div>

      {/* Last updated */}
      <div className="text-[10px] text-muted-foreground">
        Updated {formatRelativeTime(lastUpdated.toISOString())}
        <button
          className="ml-1 text-primary hover:underline"
          onClick={fetchMetrics}
        >
          (refresh)
        </button>
      </div>
    </div>
  );
}
