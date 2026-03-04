"use client";

import { useEffect, useState, useCallback } from "react";
import { Badge } from "@/components/ui/badge";
import { api, Task } from "@/lib/api-client";
import { formatDate } from "@/lib/utils";

interface TasksPanelProps {
  projectId: string;
}

export function TasksPanel({ projectId }: TasksPanelProps) {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchTasks = useCallback(async () => {
    try {
      const data = await api.tasks.list({ projectId });
      setTasks(data);
    } catch (err) {
      console.error("Failed to fetch tasks:", err);
    } finally {
      setLoading(false);
    }
  }, [projectId]);

  useEffect(() => {
    fetchTasks();
    // Poll every 5 seconds for live updates
    const interval = setInterval(fetchTasks, 5000);
    return () => clearInterval(interval);
  }, [fetchTasks]);

  if (loading) {
    return (
      <div className="space-y-3">
        <h3 className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">
          Tasks
        </h3>
        <div className="flex items-center justify-center py-8">
          <span className="text-xs text-muted-foreground animate-pulse">
            Loading...
          </span>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">
          Tasks
        </h3>
        <span className="text-[10px] text-muted-foreground">
          {tasks.length} total
        </span>
      </div>

      <div className="space-y-3 overflow-y-auto max-h-[700px] pr-1 scrollbar-thin">
        {tasks.map((task) => (
          <TaskCard key={task.id} task={task} />
        ))}
        {tasks.length === 0 && (
          <div className="border border-dashed border-border p-6 text-center">
            <p className="text-xs text-muted-foreground">
              No tasks yet. The AI planner is analyzing your company...
            </p>
            <div className="mt-2">
              <span className="text-[10px] text-primary animate-pulse">
                Planning in progress
              </span>
            </div>
          </div>
        )}
      </div>

      {tasks.length > 0 && (
        <button className="text-xs text-primary hover:underline">
          Manage &rarr;
        </button>
      )}
    </div>
  );
}

function TaskCard({ task }: { task: Task }) {
  const statusColor = (() => {
    switch (task.status) {
      case "COMPLETED":
        return "success" as const;
      case "IN_PROGRESS":
        return "default" as const;
      case "FAILED":
        return "destructive" as const;
      default:
        return "outline" as const;
    }
  })();

  return (
    <div className="border border-dashed border-border p-4 space-y-2 hover:border-primary/50 transition-colors">
      <h4 className="font-bold text-sm leading-tight text-foreground">
        {task.title}
      </h4>
      {task.description && (
        <p className="text-[11px] text-muted-foreground line-clamp-3 leading-relaxed">
          {task.description}
        </p>
      )}
      <div className="flex items-center gap-2 pt-1 flex-wrap">
        <Badge variant="secondary">{task.category}</Badge>
        <Badge variant={statusColor}>{task.status}</Badge>
        {task.scheduledFor && (
          <Badge variant="outline" className="text-[10px]">
            {formatDate(task.scheduledFor)}
          </Badge>
        )}
      </div>
    </div>
  );
}
