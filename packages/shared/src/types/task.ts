export const TaskCategory = {
  GROWTH: "GROWTH",
  MARKETING: "MARKETING",
  OUTREACH: "OUTREACH",
  PRODUCT: "PRODUCT",
  ANALYTICS: "ANALYTICS",
  OPERATIONS: "OPERATIONS",
  RESEARCH: "RESEARCH",
} as const;

export type TaskCategory = (typeof TaskCategory)[keyof typeof TaskCategory];

export const TaskPriority = {
  CRITICAL: "CRITICAL",
  HIGH: "HIGH",
  MEDIUM: "MEDIUM",
  LOW: "LOW",
} as const;

export type TaskPriority = (typeof TaskPriority)[keyof typeof TaskPriority];

export const TaskStatus = {
  PENDING: "PENDING",
  IN_PROGRESS: "IN_PROGRESS",
  COMPLETED: "COMPLETED",
  FAILED: "FAILED",
  CANCELLED: "CANCELLED",
} as const;

export type TaskStatus = (typeof TaskStatus)[keyof typeof TaskStatus];

export interface Task {
  id: string;
  projectId: string;
  title: string;
  description: string;
  category: TaskCategory;
  priority: TaskPriority;
  status: TaskStatus;
  automatable: boolean;
  agentName: string | null;
  result: string | null;
  scheduledFor: Date | null;
  completedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateTaskInput {
  projectId: string;
  title: string;
  description: string;
  category: TaskCategory;
  priority: TaskPriority;
  automatable?: boolean;
  agentName?: string;
  scheduledFor?: Date;
}

export interface PlannedTask {
  title: string;
  description: string;
  category: TaskCategory;
  priority: TaskPriority;
  automatable: boolean;
  agentName: string | null;
}
