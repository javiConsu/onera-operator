import { tool } from "ai";
import { z } from "zod";
import { generateText } from "ai";
import { getModel } from "@onera/ai";

export const generateTweet = tool({
  description:
    "Generate a tweet for the startup. Takes a topic and startup context, " +
    "produces an engaging tweet ready to post.",
  parameters: z.object({
    topic: z.string().describe("The topic or theme for the tweet"),
    startupContext: z
      .string()
      .describe("Startup name, product description, and target audience"),
    tone: z
      .enum(["professional", "casual", "exciting", "informative"])
      .optional()
      .describe("The desired tone of the tweet"),
  }),
  execute: async ({ topic, startupContext, tone }) => {
    const model = getModel();
    const { text } = await generateText({
      model,
      system:
        "You are a social media expert for startups. Generate a single tweet (max 280 characters). " +
        "Make it engaging, relevant, and include a call to action when appropriate. " +
        "Do not include hashtags unless they are highly relevant. Do not use quotes around the tweet.",
      prompt:
        `Startup context: ${startupContext}\n\n` +
        `Topic: ${topic}\n` +
        `Tone: ${tone || "professional"}\n\n` +
        `Generate one tweet:`,
    });

    return {
      tweet: text.trim(),
      characterCount: text.trim().length,
      topic,
      tone: tone || "professional",
    };
  },
});
