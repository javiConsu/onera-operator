import { z } from "zod";

export const dailyReportOutputSchema = z.object({
  content: z.string().describe("The full daily report in markdown format"),
  highlights: z
    .array(z.string())
    .describe("Key highlights from the day"),
  blockers: z
    .array(z.string())
    .describe("Any blockers or issues encountered"),
  nextSteps: z
    .array(z.string())
    .describe("Recommended next steps for tomorrow"),
});

export type DailyReportOutputSchema = z.infer<typeof dailyReportOutputSchema>;
