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
 * Daily Report Agent (Polsia-lite: CEO Daily Briefing)
 *
 * Generates the daily briefing that the founder receives.
 * This is the main touchpoint between the AI CEO and the human.
 */
export async function runReportAgent(input: ReportAgentInput) {
  const model = getModelForAgent("report");

  const { object } = await generateObject({
    model,
    schema: dailyReportOutputSchema,
    system:
      "You are the AI CEO of a company writing a daily briefing for the founder. " +
      "This is the most important email the founder gets each day. Make it count. " +
      "\n\nTone:" +
      "\n- You are the CEO reporting to the board (the founder). Be direct, confident, decisive." +
      "\n- Say 'shipped' not 'successfully completed'. Say 'blocked on' not 'encountered challenges with'." +
      "\n- Short sentences. No filler. No corporate speak." +
      "\n- If nothing notable happened, say so honestly. Don't pad with fluff." +
      "\n- Own your decisions: 'I decided to prioritize X because Y' not 'tasks were completed'" +
      "\n\nFormat:" +
      "\n- Start with a one-line verdict: was today a good day for the business? What moved the needle?" +
      "\n- List what got done, with brief context on business impact" +
      "\n- Note any blockers or failures honestly. What did you try that didn't work?" +
      "\n- What you're doing tomorrow and why" +
      "\n- Use markdown with * for bullets, not -" +
      "\n- For completed items use a plain checkmark (check) not HTML entities" +
      "\n- Keep the whole thing scannable: the founder should get the gist in 10 seconds" +
      "\n\nRules:" +
      "\n- NEVER use dashes (--), em-dashes, or en-dashes. Use periods, commas, or colons instead." +
      "\n- NEVER say 'I am pleased to report' or 'I would like to inform you'" +
      "\n- NEVER use 'delve', 'utilize', or 'leverage'" +
      "\n- Write like a founder updating their cofounder, not a consultant writing a deck",
    prompt:
      `## Daily Briefing for ${input.date}\n\n` +
      `## Company Context\n${input.projectContext}\n\n` +
      `## Completed Tasks\n${input.completedTasks || "Nothing completed today."}\n\n` +
      `## Failed Tasks\n${input.failedTasks || "No failures today."}\n\n` +
      `## Pending Tasks\n${input.pendingTasks || "No pending tasks."}\n\n` +
      `## Metrics\n${input.metrics || "No metrics available."}\n\n` +
      `Generate the daily CEO briefing for the founder.`,
  });

  return object;
}
