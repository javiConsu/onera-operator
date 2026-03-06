import { tool } from "ai";
import { z } from "zod";
import { generateText } from "ai";
import { getModel } from "@onera/ai";

/**
 * Find Leads Tool
 *
 * Takes startup context + target audience and generates structured lead
 * profiles with emails. Works best when the calling agent has already
 * done a webSearch and passes real company data in the targetAudience
 * or startupContext fields.
 *
 * Returns structured JSON lead objects (not free-form text).
 */
export const findLeads = tool({
  description:
    "Generate structured lead profiles for outreach. Returns an array of " +
    "lead objects with companyName, contactName, contactRole, email, companyUrl, " +
    "reason, and outreachAngle. For best results, first use webSearch to find " +
    "real companies, then pass those results here to get structured profiles.",
  parameters: z.object({
    startupContext: z
      .string()
      .describe("Startup name, product, and value proposition"),
    targetAudience: z
      .string()
      .describe(
        "Description of the ideal customer / target audience. " +
        "Include any web search results or company URLs you found for better leads."
      ),
    count: z
      .number()
      .min(1)
      .max(20)
      .describe(
        "Number of lead profiles to generate. Use 5 for a standard batch."
      ),
    industry: z
      .string()
      .describe(
        "Specific industry to target. Use an empty string for no specific industry filter."
      ),
  }),
  execute: async ({ startupContext, targetAudience, count, industry }) => {
    try {
      const model = getModel();
      const leadCount = count;
      const industryFilter =
        industry.length > 0 ? `\nIndustry focus: ${industry}` : "";

      const { text } = await generateText({
        model,
        system:
          "You are a B2B lead generation specialist. Generate structured lead profiles.\n\n" +
          "## CRITICAL RULES\n" +
                     "1. You MUST include a contact email for EVERY lead. No exceptions.\n" +
          "2. If company URLs or domains are provided in the input, extract the root domain " +
          "and construct role-based emails. Use the pattern: role@domain.com\n" +
          "   - For founders/CEOs: founder@, ceo@, or their first name @ the domain\n" +
          "   - For technical roles: cto@, engineering@, tech@\n" +
          "   - General: hello@, info@, contact@, team@\n" +
          "3. For companies without clear contact info, use the company domain with common " +
          "prefixes (hello@, info@, contact@, team@).\n" +
          "4. NEVER return 'unknown' or empty emails. Every lead MUST have a valid-looking email.\n" +
          "5. Prefer specific role emails (cto@, founder@) over generic ones (info@, hello@).\n" +
          "6. If you have real company data from web search results, use it. Do NOT make up companies " +
          "when real ones are provided.\n" +
          "7. These are role-based email guesses, which is standard practice in B2B cold outreach. " +
          "They should use REAL company domains extracted from URLs in the input.\n\n" +
          "## Output Format\n" +
          "Return a JSON array of objects. ONLY output the JSON array, no other text.\n" +
          "Each object must have exactly these fields:\n" +
          "- companyName: string (the company name)\n" +
          "- contactName: string (the contact person's name, or 'Team' if unknown)\n" +
          "- contactRole: string (their job title)\n" +
          "- email: string (their email address, MUST be a real-looking email with the company domain)\n" +
          "- companyUrl: string (the company website URL)\n" +
          "- companySize: string (e.g., '1-10', '11-50', '51-200', '200+')\n" +
          "- reason: string (why they are a good fit, 1 sentence)\n" +
          "- outreachAngle: string (suggested approach for the email, 1 sentence)",
        prompt:
          `Startup context: ${startupContext}\n\n` +
          `Target audience: ${targetAudience}${industryFilter}\n\n` +
          `Generate exactly ${leadCount} lead profiles as a JSON array.`,
        maxTokens: 3000,
      });

      // Parse the JSON response
      let leads: Array<{
        companyName: string;
        contactName: string;
        contactRole: string;
        email: string;
        companyUrl: string;
        companySize: string;
        reason: string;
        outreachAngle: string;
      }> = [];

      try {
        const jsonMatch = text.match(/\[[\s\S]*\]/);
        if (jsonMatch) {
          leads = JSON.parse(jsonMatch[0]);
        }
      } catch (parseErr) {
        console.error("[find-leads] Failed to parse JSON response:", parseErr);
        return {
          leads: [],
          rawText: text.trim(),
          count: 0,
          targetAudience,
          industry: industry.length > 0 ? industry : "general",
          error: "Failed to parse structured response",
        };
      }

      // Filter out leads without valid emails
      const validLeads = leads.filter(
        (l) =>
          l.email &&
          l.email.length > 0 &&
          l.email !== "unknown" &&
          l.email.includes("@")
      );

      return {
        leads: validLeads.slice(0, leadCount),
        count: validLeads.length,
        targetAudience,
        industry: industry.length > 0 ? industry : "general",
        note: "Emails are role-based guesses using real company domains. This is standard B2B cold outreach practice. Proceed to generateEmail and sendEmail for each lead.",
      };
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      console.error("[find-leads] Error:", message);
      return {
        leads: [],
        count: 0,
        targetAudience,
        industry: industry.length > 0 ? industry : "general",
        error: message,
      };
    }
  },
});
