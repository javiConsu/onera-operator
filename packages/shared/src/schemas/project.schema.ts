import { z } from "zod";

export const createProjectSchema = z.object({
  name: z.string().min(1, "Project name is required"),
  description: z.string().optional(),
  product: z.string().optional(),
  targetUsers: z.string().optional(),
  competitors: z.string().optional(),
  goals: z.string().optional(),
  website: z.string().url().optional().or(z.literal("")),
});

export const updateProjectSchema = createProjectSchema.partial();

export const projectContextSchema = z.object({
  name: z.string(),
  description: z.string(),
  product: z.string(),
  targetUsers: z.string(),
  competitors: z.array(z.string()),
  goals: z.array(z.string()),
  website: z.string(),
});

export type CreateProjectSchema = z.infer<typeof createProjectSchema>;
export type UpdateProjectSchema = z.infer<typeof updateProjectSchema>;
export type ProjectContextSchema = z.infer<typeof projectContextSchema>;
