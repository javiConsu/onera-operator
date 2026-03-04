import { createOpenAI } from "@ai-sdk/openai";
import { createAnthropic } from "@ai-sdk/anthropic";
import { createAzure } from "@ai-sdk/azure";
import { createOpenAICompatible } from "@ai-sdk/openai-compatible";
import type { LanguageModel } from "ai";
import { loadAIConfig, type AIConfig } from "./config.js";

let cachedModel: LanguageModel | null = null;
let cachedConfig: AIConfig | null = null;

/**
 * Creates a language model instance based on the configured provider.
 * This is the single entry point for all LLM access in Onera Operator.
 *
 * Provider is determined by the AI_PROVIDER environment variable.
 * Never import provider SDKs directly — always use this function.
 */
export function getModel(configOverride?: Partial<AIConfig>): LanguageModel {
  const config = { ...loadAIConfig(), ...configOverride };

  // Return cached model if config hasn't changed
  if (
    cachedModel &&
    cachedConfig &&
    cachedConfig.provider === config.provider &&
    cachedConfig.model === config.model &&
    cachedConfig.apiKey === config.apiKey
  ) {
    return cachedModel;
  }

  cachedConfig = config;
  cachedModel = createModelForProvider(config);
  return cachedModel;
}

function createModelForProvider(config: AIConfig): LanguageModel {
  switch (config.provider) {
    case "openai": {
      const openai = createOpenAI({
        apiKey: config.apiKey,
        ...(config.baseURL ? { baseURL: config.baseURL } : {}),
      });
      return openai(config.model);
    }

    case "anthropic": {
      const anthropic = createAnthropic({
        apiKey: config.apiKey,
      });
      return anthropic(config.model);
    }

    case "azure": {
      const azureOptions: Record<string, unknown> = {
        apiKey: config.apiKey,
      };
      // Support either a full base URL or a resource name.
      // @ai-sdk/azure with baseURL resolves as: {baseURL}/{modelId}{path}
      // So baseURL must include /openai/deployments to work properly.
      // If the user gives us a root Azure URL, we append the path ourselves.
      if (config.baseURL) {
        let base = config.baseURL.replace(/\/+$/, ""); // strip trailing slashes
        if (!base.includes("/openai/deployments")) {
          base = `${base}/openai/deployments`;
        }
        azureOptions.baseURL = base;
      } else if (config.azureResourceName) {
        azureOptions.resourceName = config.azureResourceName;
      } else {
        throw new Error(
          "Either AI_BASE_URL or AI_AZURE_RESOURCE_NAME is required for Azure OpenAI provider"
        );
      }
      const azure = createAzure(azureOptions);
      return azure(config.azureDeploymentName || config.model);
    }

    case "openai-compatible": {
      if (!config.baseURL) {
        throw new Error(
          "AI_BASE_URL is required for openai-compatible provider"
        );
      }
      const compatible = createOpenAICompatible({
        name: "custom-provider",
        baseURL: config.baseURL,
        apiKey: config.apiKey || undefined,
      });
      return compatible.chatModel(config.model);
    }

    default:
      throw new Error(`Unsupported AI provider: ${config.provider}`);
  }
}

/**
 * Clears the cached model. Useful when config changes at runtime.
 */
export function resetModel(): void {
  cachedModel = null;
  cachedConfig = null;
}
