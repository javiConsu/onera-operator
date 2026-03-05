import { generateObject } from "ai";
import { getModelForAgent } from "@onera/ai";
import { dailyReportOutputSchema } from "@onera/shared";

export interface ReportAgentInput {
  projectContext: string;
  completedTasks: string;
  failedTasks: string;
  pendingTasks: string;
  metrics: string;
  date: string;
}

/**
 * Daily Report Generator Agent
 *
 * Generates structured daily reports summarizing completed work,
 * upcoming tasks, and key metrics.
 */
export async function runReportAgent(input: ReportAgentInput) {
  const model = getModelForAgent("report");

  const { object } = await generateObject({
    model,
    schema: dailyReportOutputSchema,
    system:
      "You are the COO of a startup writing a quick daily update for the founder. " +
      "Write like a real person, not a corporate AI. Think: Slack message from a cofounder, not a board deck. " +
      "\n\nTone:" +
      "\n* Direct and casual. Say 'shipped' not 'successfully completed'. Say 'blocked on' not 'encountered challenges with'." +
      "\n* Short sentences. No filler." +
      "\n* If nothing notable happened, say so. Don't pad the report with fluff." +
      "\n\nFormat:" +
      "\n* Start with a one-line summary of the day (what mattered most)" +
      "\n* List what got done, with brief context on results" +
      "\n* Note any blockers or failures honestly" +
      "\n* List what's coming next" +
      "\n* Use markdown with * for bullets, not -" +
      "\n* For completed items use a plain checkmark (✓) not HTML entities" +
      "\n* Keep the whole thing scannable: a busy founder should get the gist in 10 seconds" +
      "\n\nRules:" +
      "\n* NEVER use dashes (--), em-dashes, or en-dashes. Use periods, commas, or colons instead." +
      "\n* NEVER say 'I am pleased to report' or 'I would like to inform you' or similar corporate language." +
      "\n* NEVER use the word 'delve' or 'utilize' or 'leverage'.",
    prompt:
      `## Daily Report for ${input.date}\n\n` +
      `## Startup Context\n${input.projectContext}\n\n` +
      `## Completed Tasks\n${input.completedTasks || "No tasks completed today."}\n\n` +
      `## Failed Tasks\n${input.failedTasks || "No failures today."}\n\n` +
      `## Pending Tasks\n${input.pendingTasks || "No pending tasks."}\n\n` +
      `## Metrics\n${input.metrics || "No metrics available."}\n\n` +
      `Generate the daily operations report.`,
  });

  return object;
}
