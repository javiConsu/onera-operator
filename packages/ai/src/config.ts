export type AIProviderType =
  | "openai"
  | "azure"
  | "anthropic"
  | "openai-compatible";

export interface AIConfig {
  provider: AIProviderType;
  model: string;
  apiKey: string;
  baseURL?: string;
  azureResourceName?: string;
  azureDeploymentName?: string;
}

export function loadAIConfig(): AIConfig {
  const provider = (process.env.AI_PROVIDER || "openai") as AIProviderType;
  const model = process.env.AI_MODEL || "gpt-4o";
  const apiKey = process.env.AI_API_KEY || "";

  if (!apiKey && provider !== "openai-compatible") {
    console.warn(
      `[onera-ai] Warning: AI_API_KEY is not set for provider "${provider}". ` +
        "LLM calls will fail until a valid key is provided."
    );
  }

  return {
    provider,
    model,
    apiKey,
    baseURL: process.env.AI_BASE_URL || undefined,
    azureResourceName: process.env.AI_AZURE_RESOURCE_NAME || undefined,
    azureDeploymentName: process.env.AI_AZURE_DEPLOYMENT_NAME || undefined,
  };
}
