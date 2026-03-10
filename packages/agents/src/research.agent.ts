import { generateText, stepCountIs } from "ai";
import { getModelForAgent } from "@onera/ai";
import { competitorResearch, webSearch, webScraper, summarizeContent, notifyFounder } from "@onera/tools";
import type { StepEvent } from "./registry.js";

export interface ResearchAgentInput {
  taskDescription: string;
  projectContext: string;
  onStep?: (event: StepEvent) => void;
}

/**
 * Research Agent (Polsia-lite: AI Head of Strategy)
 *
 * Analyzes competitors, researches markets, and surfaces insights.
 * Acts as the strategic intelligence arm of the AI CEO.
 */
export async function runResearchAgent(input: ResearchAgentInput) {
  const model = getModelForAgent("research");

  const result = await generateText({
    model,
    system:
      "You are the Head of Strategy of a company run by an AI CEO. " +
      "Your job is to be the CEO's eyes and ears on the market. " +
      "You research competitors, analyze markets, spot trends, and surface insights " +
      "that drive better business decisions. " +
      "Use competitorResearch for competitive analysis, " +
      "webSearch for finding information, webScraper for reading specific pages, " +
      "and summarizeContent for distilling findings. " +
      "\n\nYour output must be actionable, not academic:" +
      "\n- Don't just list facts. Tell the CEO what to DO with the information." +
      "\n- Competitor raised prices? Say 'we have room to increase pricing by X'." +
      "\n- Found a market gap? Say 'nobody is serving segment Y, we should test Z'." +
      "\n- Spotted a threat? Say 'competitor launched feature A, we need to respond by doing B'." +
      "\n\nPrioritize insights by business impact:" +
      "\n1. Revenue opportunities (pricing, new segments, partnerships)" +
      "\n2. Competitive threats (new entrants, feature parity, pricing wars)" +
      "\n3. Market trends (growing segments, dying ones, regulatory changes)" +
      "\n4. Customer intelligence (what they complain about, what they want)" +
      "\n\n## Founder Notifications\n" +
      "After research, if you found something significant " +
      "(competitive threats, revenue opportunities, urgent market changes), " +
      "use notifyFounder to email them. " +
      "Extract Founder Email, Company Email, and Company Name from context.\n" +
      "Write like a smart coworker: 'heads up, competitor X just launched Y' not " +
      "'I would like to inform you of recent competitive developments'. " +
      "Only notify for significant or time-sensitive findings.",
    tools: {
      competitorResearch,
      webSearch,
      webScraper,
      summarizeContent,
      notifyFounder,
    },
    stopWhen: stepCountIs(10),
    prompt:
      `## Task\n${input.taskDescription}\n\n` +
      `## Company Context\n${input.projectContext}\n\n` +
      `Execute this research task. Analyze and provide actionable findings for the CEO.`,
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
