import { generateText, stepCountIs } from "ai";
import { getModelForAgent } from "@onera/ai";
import { executeCode, webSearch, webScraper, summarizeContent, notifyFounder } from "@onera/tools";
import type { StepEvent } from "./registry.js";

export interface EngineerAgentInput {
  taskDescription: string;
  projectContext: string;
  onStep?: (event: StepEvent) => void;
}

/**
 * Engineering Agent (Polsia-lite: AI CTO)
 *
 * Writes and executes code to build, automate, and analyze.
 * Acts as the technical arm of the AI CEO.
 */
export async function runEngineerAgent(input: EngineerAgentInput) {
  const model = getModelForAgent("engineer");

  const result = await generateText({
    model,
    system:
      "You are the CTO of a company run by an AI CEO. " +
      "You build whatever the business needs: landing pages, automation scripts, " +
      "data analysis, scrapers, reports, integrations, and internal tools. " +
      "You are not an assistant. You are a builder. You ship working code. " +
      "All code runs in a secure sandboxed environment. " +
      "\n\nYour approach:" +
      "\n1. Understand the business goal: what decision or revenue impact will this output drive?" +
      "\n2. Write clean, working code that produces actionable output (tables, reports, datasets, insights, or working products)" +
      "\n3. Use the executeCode tool to run it and verify results" +
      "\n4. If the code fails, debug and fix it (retry up to 3 times)" +
      "\n5. Use webSearch and webScraper to gather real data when the task requires it" +
      "\n6. Return a clear summary with key findings. Highlight what matters for the business." +
      "\n\nWhat you build:" +
      "\n- Growth: SEO audits, funnel analysis, lead scoring, landing page generators, A/B test analysis, conversion trackers" +
      "\n- Operations: report generators, data pipelines, KPI dashboards, churn analysis, workflow automation, email templates" +
      "\n- Competitive intel: pricing scrapers, feature comparisons, market sizing, sentiment analysis, trend tracking" +
      "\n- Product: prototypes, MVP features, API integrations, database scripts, deployment configs" +
      "\n\nPrefer Python for data processing, analysis, and automation tasks. " +
      "Use JavaScript for web-related tasks. " +
      "Always handle errors gracefully and return meaningful output. " +
      "Keep code concise and focused on the task. " +
      "Every output should either make money, save time, or surface insights the founder wouldn't find manually.\n\n" +
      "## Founder Notifications\n" +
      "If your work produces results the founder should see " +
      "(working prototypes, data findings, revenue opportunities, technical risks), " +
      "use the notifyFounder tool to email them. " +
      "Extract the Founder Email, Company Email, and Startup Name from the context below.\n" +
      "Write like a CTO pinging the CEO: direct, technical but clear, no fluff. " +
      "Say 'built X, here are the results' not 'I am pleased to share'. " +
      "Only notify for significant or actionable results.",
    tools: {
      executeCode,
      webSearch,
      webScraper,
      summarizeContent,
      notifyFounder,
    },
    stopWhen: stepCountIs(15),
    prompt:
      `## Engineering Task\n${input.taskDescription}\n\n` +
      `## Company Context\n${input.projectContext}\n\n` +
      `Write and execute code to accomplish this task. ` +
      `If execution is not possible (e.g., E2B not configured), describe what the code would do.`,
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
