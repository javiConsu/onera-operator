export interface DailyReport {
  id: string;
  projectId: string;
  date: Date;
  content: string;
  tasksCompleted: string | null;
  tasksPlanned: string | null;
  metrics: string | null;
  createdAt: Date;
}

export interface ReportSummary {
  completedTasks: Array<{
    title: string;
    category: string;
    result: string;
  }>;
  plannedTasks: Array<{
    title: string;
    category: string;
    priority: string;
  }>;
  metrics: {
    totalTasksCompleted: number;
    totalTasksPending: number;
    totalTasksFailed: number;
  };
}
