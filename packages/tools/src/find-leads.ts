import { tool } from "ai";
import { z } from "zod";
import { generateText } from "ai";
import { getModel } from "@onera/ai";

export const findLeads = tool({
  description:
    "Generate a list of potential leads based on the startup's target market. " +
    "Produces lead profiles with suggested outreach approaches.",
  parameters: z.object({
    startupContext: z
      .string()
      .describe("Startup name, product, and value proposition"),
    targetAudience: z
      .string()
      .describe("Description of the ideal customer / target audience"),
    count: z
      .number()
      .min(1)
      .max(20)
      .optional()
      .describe("Number of lead profiles to generate (default: 5)"),
    industry: z.string().optional().describe("Specific industry to target"),
  }),
  execute: async ({ startupContext, targetAudience, count, industry }) => {
    const model = getModel();
    const leadCount = count || 5;
    const { text } = await generateText({
      model,
      system:
        "You are a B2B lead generation specialist. " +
        "Generate realistic lead profiles that match the target audience. " +
        "Each lead should include: company name, contact role, company size, " +
        "why they're a good fit, and a suggested outreach angle. " +
        "Format each lead as a numbered list with clear subsections.",
      prompt:
        `Startup context: ${startupContext}\n\n` +
        `Target audience: ${targetAudience}\n` +
        `${industry ? `Industry focus: ${industry}` : ""}\n\n` +
        `Generate ${leadCount} potential lead profiles:`,
    });

    return {
      leads: text.trim(),
      count: leadCount,
      targetAudience,
      industry: industry || "general",
    };
  },
});
