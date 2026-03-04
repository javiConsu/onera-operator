import { tool } from "ai";
import { z } from "zod";

/**
 * Web scraper tool — fetches a URL and extracts readable text content.
 * Used by researchCompanyUrl and the research agent to read real web pages.
 */
export const webScraper = tool({
  description:
    "Fetch a web page URL and extract its text content. Use this to read websites, blog posts, documentation, or any public URL.",
  parameters: z.object({
    url: z.string().url().describe("The URL to fetch"),
    maxLength: z
      .number()
      .optional()
      .describe("Maximum characters to return (default: 8000)"),
  }),
  execute: async ({ url, maxLength = 8000 }) => {
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 15000);

      const res = await fetch(url, {
        signal: controller.signal,
        headers: {
          "User-Agent":
            "Mozilla/5.0 (compatible; OneraBot/1.0; +https://oneraos.com)",
          Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        },
        redirect: "follow",
      });

      clearTimeout(timeout);

      if (!res.ok) {
        return {
          url,
          success: false,
          error: `HTTP ${res.status}: ${res.statusText}`,
          content: "",
        };
      }

      const contentType = res.headers.get("content-type") || "";
      if (
        !contentType.includes("text/html") &&
        !contentType.includes("text/plain") &&
        !contentType.includes("application/json") &&
        !contentType.includes("application/xml")
      ) {
        return {
          url,
          success: false,
          error: `Unsupported content type: ${contentType}`,
          content: "",
        };
      }

      const html = await res.text();

      // Strip HTML tags and extract text
      const text = extractText(html);
      const trimmed =
        text.length > maxLength ? text.substring(0, maxLength) + "..." : text;

      return {
        url,
        success: true,
        content: trimmed,
        contentLength: text.length,
        truncated: text.length > maxLength,
      };
    } catch (err) {
      const message =
        err instanceof Error ? err.message : String(err);
      return {
        url,
        success: false,
        error: message.includes("abort")
          ? "Request timed out after 15 seconds"
          : message,
        content: "",
      };
    }
  },
});

/**
 * Basic HTML-to-text extraction.
 * Strips scripts, styles, tags, and normalizes whitespace.
 */
function extractText(html: string): string {
  let text = html;

  // Remove script and style blocks
  text = text.replace(/<script[\s\S]*?<\/script>/gi, " ");
  text = text.replace(/<style[\s\S]*?<\/style>/gi, " ");
  text = text.replace(/<noscript[\s\S]*?<\/noscript>/gi, " ");

  // Remove HTML comments
  text = text.replace(/<!--[\s\S]*?-->/g, " ");

  // Replace block-level tags with newlines
  text = text.replace(
    /<\/?(?:div|p|h[1-6]|li|tr|br|hr|section|article|header|footer|nav|main|aside|blockquote|pre|ul|ol|table|thead|tbody|tfoot)[^>]*>/gi,
    "\n"
  );

  // Remove remaining HTML tags
  text = text.replace(/<[^>]+>/g, " ");

  // Decode common HTML entities
  text = text
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, " ")
    .replace(/&#\d+;/g, " ")
    .replace(/&\w+;/g, " ");

  // Normalize whitespace
  text = text.replace(/[ \t]+/g, " ");
  text = text.replace(/\n\s*\n/g, "\n\n");
  text = text
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line.length > 0)
    .join("\n");

  return text.trim();
}
