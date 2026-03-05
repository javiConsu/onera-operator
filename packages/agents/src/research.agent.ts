import { generateText } from "ai";
import { getModelForAgent } from "@onera/ai";
import { competitorResearch, webSearch, webScraper, summarizeContent } from "@onera/tools";
import type { StepEvent } from "./registry.js";

export interface ResearchAgentInput {
  taskDescription: string;
  projectContext: string;
  onStep?: (event: StepEvent) => void;
}

/**
 * Research Agent
 *
 * Analyzes competitors, researches markets, and summarizes findings.
 * Uses the competitorResearch, webSearch, and summarizeContent tools.
 */
export async function runResearchAgent(input: ResearchAgentInput) {
  const model = getModelForAgent("research");

  const result = await generateText({
    model,
    system:
      "You are a startup research analyst. " +
      "Your job is to conduct research on competitors, markets, and trends. " +
      "Use the competitorResearch tool for competitive analysis, " +
      "webSearch for finding information, webScraper for reading specific web pages, " +
      "and summarizeContent for distilling findings. " +
      "Provide actionable insights, not just data.",
    tools: {
      competitorResearch,
      webSearch,
      webScraper,
      summarizeContent,
    },
    maxSteps: 10,
    prompt:
      `## Task\n${input.taskDescription}\n\n` +
      `## Startup Context\n${input.projectContext}\n\n` +
      `Execute this research task. Analyze and provide actionable findings.`,
    onStepFinish: (step) => {
      if (!input.onStep) return;
      if (step.text) {
        input.onStep({ type: "thinking", message: step.text });
      }
      for (const tc of step.toolCalls || []) {
        input.onStep({ type: "tool_call", message: `Using ${tc.toolName}`, data: tc.args });
      }
      for (const tr of step.toolResults || []) {
        input.onStep({ type: "tool_result", message: `${tr.toolName} done`, data: tr.result });
      }
    },
  });

  return {
    text: result.text,
    steps: result.steps.length,
    toolCalls: result.steps.flatMap((s) =>
      (s.toolCalls || []).map((tc) => ({
        tool: tc.toolName,
        args: tc.args,
      }))
    ),
    toolResults: result.steps.flatMap((s) =>
      (s.toolResults || []).map((tr) => ({
        tool: tr.toolName,
        result: tr.result,
      }))
    ),
  };
}
