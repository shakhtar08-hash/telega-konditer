import type { GenerateImageInput } from "./ai-service";
import { sanitizeOutboundPrompt } from "./ai-request-sanitizer";

type DirectGenerateImage = (
  input: GenerateImageInput,
) => Promise<{ url: string }>;

type AITransportConfig = {
  gatewayUrl?: string;
  sharedSecret?: string;
  directGenerateImage: DirectGenerateImage;
};

export function createAITransport(config: AITransportConfig) {
  return {
    async generateImage(input: GenerateImageInput): Promise<{ url: string }> {
      const sanitized = {
        ...input,
        prompt: sanitizeOutboundPrompt(input.prompt),
      };
      const route = resolveGatewayRoute(config);

      if (route.gatewayUrl && route.sharedSecret) {
        const response = await fetch(route.gatewayUrl, {
          body: JSON.stringify(sanitized),
          headers: {
            "content-type": "application/json",
            "x-internal-shared-secret": route.sharedSecret,
          },
          method: "POST",
        });

        if (!response.ok) {
          throw new Error("Internal AI gateway request failed");
        }

        return (await response.json()) as { url: string };
      }

      return config.directGenerateImage(sanitized);
    },
  };
}

function resolveGatewayRoute(config: AITransportConfig) {
  if ("gatewayUrl" in config || "sharedSecret" in config) {
    return {
      gatewayUrl: config.gatewayUrl,
      sharedSecret: config.sharedSecret,
    };
  }

  return {
    gatewayUrl: process.env.INTERNAL_AI_GATEWAY_URL,
    sharedSecret: process.env.INTERNAL_API_SHARED_SECRET,
  };
}
