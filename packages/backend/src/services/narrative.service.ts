import { generateText } from "ai";
import { getNanoModel } from "@onera/ai";

// ─── Narrative Rewriter ─────────────────────────────────────────
// Rewrites raw agent events into human-readable one-sentence narratives
// using GPT-4.1-nano. This runs ONCE in the backend before publishing
// to Redis, so all SSE clients receive the pre-rewritten text.
//
// Cost: ~$0.10/$0.40 per 1M tokens → ~$0.05 per 2,760 rewrites.

const SYSTEM_PROMPT =
  "You rewrite raw AI agent log messages into single, concise, " +
  "human-readable sentences for a live operations dashboard. " +
  "The audience is non-technical founders watching their AI agents work.\n\n" +
  "Rules:\n" +
  "- Output ONLY the rewritten sentence, nothing else\n" +
  "- One sentence max, under 120 characters\n" +
  "- Use present tense ('Researching...', 'Sending email to...')\n" +
  "- Remove tool names, JSON, IDs, and technical jargon\n" +
  "- Keep company names, people names, and action context\n" +
  "- For 'started' events: describe what the agent is about to do\n" +
  "- For 'completed' events: describe what was accomplished\n" +
  "- For 'failed' events: say what went wrong simply\n" +
  "- For 'tool_call' events: describe the action being taken\n" +
  "- For 'thinking' events: summarize the reasoning briefly\n" +
  "- Do NOT start with the agent name (the UI shows it separately)\n" +
  "- Do NOT use quotes, markdown, or bullet points\n" +
  "- Do NOT use dashes or em-dashes, use commas instead\n\n" +
  "Examples:\n" +
  'Input: "research starting: Competitive analysis of identity proxy market"\n' +
  'Output: "Researching competitors in the identity proxy market"\n\n' +
  'Input: "outreach completed: Send cold emails to AI infra companies"\n' +
  'Output: "Sent 8 cold emails to AI infrastructure companies"\n\n' +
  'Input: "twitter tool_call: Calling generate_tweets with {topic: \'product launch\'}"\n' +
  'Output: "Drafting tweets about the product launch"\n\n' +
  'Input: "engineer failed: Build sentiment analysis script"\n' +
  'Output: "Code execution timed out while building the analysis script"';

/**
 * Rewrites a raw agent event message into a human-readable narrative.
 *
 * Returns the original message if:
 * - The nano model is not configured
 * - The LLM call fails (non-blocking, fire-and-forget style)
 * - The event type doesn't benefit from rewriting (e.g. info)
 */
export async function rewriteNarrative(
  eventType: string,
  agentName: string,
  taskTitle: string,
  rawMessage: string
): Promise<string> {
  // Skip rewriting for low-value events — just return raw message
  if (eventType === "info" || eventType === "step") {
    return rawMessage;
  }

  // Skip very short messages that are already readable
  if (rawMessage.length < 20) {
    return rawMessage;
  }

  try {
    const model = getNanoModel();

    const { text } = await generateText({
      model,
      system: SYSTEM_PROMPT,
      prompt: `${agentName} ${eventType}: ${rawMessage}`,
      maxOutputTokens: 80,
      temperature: 0.3,
    });

    const narrative = text.trim();

    // Sanity check: if the model returned something weird, fall back
    if (!narrative || narrative.length < 5 || narrative.length > 200) {
      return rawMessage;
    }

    return narrative;
  } catch (err) {
    console.warn(
      `[narrative] Rewrite failed for ${eventType}/${agentName}:`,
      err instanceof Error ? err.message : err
    );
    return rawMessage;
  }
}
