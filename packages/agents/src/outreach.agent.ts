import { generateText, stepCountIs } from "ai";
import { getModelForAgent } from "@onera/ai";
import {
  generateEmail,
  sendEmail,
  findLeads,
  notifyFounder,
  webSearch,
  webScraper,
} from "@onera/tools";
import type { StepEvent } from "./registry.js";

export interface OutreachAgentInput {
  taskDescription: string;
  projectContext: string;
  onStep?: (event: StepEvent) => void;
}

/**
 * Email Outreach Agent (Polsia-lite: AI Head of Sales)
 *
 * Finds leads, generates personalized emails, and sends them.
 * Acts as the sales arm of the AI CEO.
 */
export async function runOutreachAgent(input: OutreachAgentInput) {
  const model = getModelForAgent("outreach");

  const result = await generateText({
    model,
    system:
      "You are the Head of Sales of a company run by an AI CEO. " +
      "You run outreach AUTONOMOUSLY. You do NOT need human confirmation to send emails. " +
      "Your job is to find potential customers, write compelling emails, and send them.\n\n" +
      "When generating emails, you MUST always pass the full company context, including the company name " +
      "and website URL, into the generateEmail tool's startupContext parameter. " +
      "Never send vague emails. Every email must clearly state who you are, " +
      "mention the recipient's company by name, and include your company URL.\n\n" +
      "## Writing style\n" +
      "NEVER use dashes (--), em-dashes, or en-dashes in any output. Use periods, commas, or colons instead.\n" +
      "Write like a human, not a robot. Short sentences. Clear value prop. No corporate speak.\n\n" +
      "## Workflow (follow this exactly)\n" +
      "1. FIRST, use webSearch to find REAL companies matching the target audience. " +
      "Do 1 to 3 searches with different queries to get a good spread.\n" +
      "2. THEN, use findLeads to convert search results into structured lead profiles with emails. " +
      "If the task specifies a number, use that. Otherwise, find exactly 10 leads and send exactly 10 emails.\n" +
      "3. For EACH lead, do a generate then send pair:\n" +
      "   a. Call generateEmail with the lead details and full company context.\n" +
      "   b. Self-review: does it mention your company + URL, the recipient's company, and have a clear CTA? If not, redo.\n" +
      "   c. Immediately call sendEmail. " +
      "ALWAYS set 'from' to the Company Email from context. " +
      "ALWAYS set 'replyTo' to the Founder Email. " +
      "ALWAYS set 'projectId' to the Project ID.\n" +
      "   d. If sendEmail returns 'rejected', fix and retry once.\n" +
      "4. After all emails, use notifyFounder with a summary.\n\n" +
      "IMPORTANT: Generate one, send one, then next lead. Do NOT batch.\n\n" +
      "CRITICAL: Use the email from findLeads. Role-based emails are standard B2B practice. " +
      "DO NOT refuse because emails are 'unverified'. Only skip if email is empty or 'unknown'.\n\n" +
      "## Founder Notifications\n" +
      "After outreach, notify the founder: how many leads found, emails sent, anything notable. " +
      "Extract Founder Email, Company Email, and Company Name from context.\n" +
      "Write it like a Slack message: casual, direct. " +
      "Say 'sent 5 emails, 2 bounced' not 'I have successfully dispatched correspondence'.",
    tools: {
      generateEmail,
      sendEmail,
      findLeads,
      notifyFounder,
      webSearch,
      webScraper,
    },
    stopWhen: stepCountIs(50),
    prompt:
      `## Task\n${input.taskDescription}\n\n` +
      `## Company Context\n${input.projectContext}\n\n` +
      `Execute this outreach task. Find leads, generate personalized emails, and send them.`,
    onStepFinish: (step) => {
      if (!input.onStep) return;
      if (step.text) {
        input.onStep({ type: "thinking", message: step.text });
      }
      for (const tc of step.toolCalls || []) {
        input.onStep({ type: "tool_call", message: `Using ${tc.toolName}`, data: tc.input });
      }
      for (const tr of step.toolResults || []) {
        input.onStep({ type: "tool_result", message: `${tr.toolName} done`, data: tr.output });
      }
    },
  });

  const allText = result.steps
    .map((s) => s.text || "")
    .filter((t) => t.length > 0)
    .join("\n\n")
    .trim();
  const finalText = result.text || allText;

  return {
    text: finalText,
    steps: result.steps.length,
    toolCalls: result.steps.flatMap((s) =>
      (s.toolCalls || []).map((tc) => ({
        tool: tc.toolName,
        args: tc.input,
      }))
    ),
    toolResults: result.steps.flatMap((s) =>
      (s.toolResults || []).map((tr) => ({
        tool: tr.toolName,
        result: tr.output,
      }))
    ),
  };
}
