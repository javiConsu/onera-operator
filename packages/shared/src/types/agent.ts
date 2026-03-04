export const AgentName = {
  PLANNER: "planner",
  TWITTER: "twitter",
  OUTREACH: "outreach",
  RESEARCH: "research",
  REPORT: "report",
  CHAT: "chat",
} as const;

export type AgentName = (typeof AgentName)[keyof typeof AgentName];

export const AgentStatusValue = {
  IDLE: "idle",
  RUNNING: "running",
  ERROR: "error",
} as const;

export type AgentStatusValue =
  (typeof AgentStatusValue)[keyof typeof AgentStatusValue];

export interface AgentStatus {
  id: string;
  name: string;
  displayName: string;
  status: AgentStatusValue;
  lastRunAt: Date | null;
  lastError: string | null;
  tasksCompleted: number;
  createdAt: Date;
  updatedAt: Date;
}
