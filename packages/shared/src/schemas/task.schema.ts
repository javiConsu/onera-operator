import { z } from "zod";

export const taskCategorySchema = z.enum([
  "GROWTH",
  "MARKETING",
  "OUTREACH",
  "PRODUCT",
  "ANALYTICS",
  "OPERATIONS",
  "RESEARCH",
]);

export const taskPrioritySchema = z.enum(["CRITICAL", "HIGH", "MEDIUM", "LOW"]);

export const taskStatusSchema = z.enum([
  "PENDING",
  "IN_PROGRESS",
  "COMPLETED",
  "FAILED",
  "CANCELLED",
]);

export const createTaskSchema = z.object({
  projectId: z.string().min(1),
  title: z.string().min(1, "Task title is required"),
  description: z.string().min(1, "Task description is required"),
  category: taskCategorySchema,
  priority: taskPrioritySchema,
  automatable: z.boolean().optional().default(false),
  agentName: z.string().optional(),
  scheduledFor: z.string().datetime().optional(),
});

export const plannedTaskSchema = z.object({
  title: z.string().describe("A concise, actionable task title"),
  description: z
    .string()
    .describe("Detailed description of what needs to be done"),
  category: taskCategorySchema.describe("The task category"),
  priority: taskPrioritySchema.describe("Task priority level"),
  automatable: z
    .boolean()
    .describe("Whether this task can be automated by an agent"),
  agentName: z
    .string()
    .nullable()
    .describe(
      "The agent that should handle this task (planner, twitter, outreach, research, report) or null if manual"
    ),
});

export const plannedTasksOutputSchema = z.object({
  tasks: z.array(plannedTaskSchema).describe("List of planned tasks"),
  reasoning: z
    .string()
    .describe("Brief explanation of why these tasks were planned"),
});

export type CreateTaskSchema = z.infer<typeof createTaskSchema>;
export type PlannedTaskSchema = z.infer<typeof plannedTaskSchema>;
export type PlannedTasksOutputSchema = z.infer<typeof plannedTasksOutputSchema>;
