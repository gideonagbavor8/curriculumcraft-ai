import OpenAI from "openai";

/**
 * Azure AI Foundry exposes an OpenAI-compatible surface at
 * {resource}/openai/v1, so the OpenAI SDK can talk to it unchanged.
 *
 * `model` here is the *deployment* name on the Foundry resource, not a
 * catalogue name: a model can be listed in the catalogue and still return
 * DeploymentNotFound if nobody has deployed it. gpt-4.1-mini is the one
 * deployed on this resource; the rest are fallbacks in case that changes.
 */
export const CLAUDE_MODEL = "gpt-4.1-mini";
const MODEL_CANDIDATES = [CLAUDE_MODEL, "gpt-4.1", "gpt-4o"] as const;

/** Strip the /api/projects/... project path to get the resource root. */
export function foundryRoot(endpoint: string): string {
  return endpoint.replace(/\/api\/projects\/.*$/, "").replace(/\/+$/, "");
}

function getFoundryClient() {
  const endpoint = process.env.AZURE_FOUNDRY_ENDPOINT;
  const apiKey = process.env.AZURE_FOUNDRY_API_KEY;

  if (!endpoint || !apiKey) {
    throw new Error(
      "AI generation is unavailable because AZURE_FOUNDRY_ENDPOINT and AZURE_FOUNDRY_API_KEY are not both set. Add them to your .env.local file and restart the server."
    );
  }

  return new OpenAI({
    baseURL: `${foundryRoot(endpoint)}/openai/v1`,
    apiKey,
    // Foundry authenticates on the api-key header; the SDK sends the key as
    // an Authorization bearer token, so send both and let the service pick.
    defaultHeaders: { "api-key": apiKey },
  });
}

export async function generateWithClaude(
  systemPrompt: string,
  userPrompt: string,
  maxTokens: number = 2000
): Promise<string> {
  const client = getFoundryClient();
  const tried: string[] = [];
  let lastError: unknown;

  for (const model of MODEL_CANDIDATES) {
    try {
      const response = await client.chat.completions.create({
        model,
        max_tokens: maxTokens,
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
      });

      const content = response.choices[0]?.message?.content;

      if (!content) {
        throw new Error(`No response content from Azure AI Foundry (${model})`);
      }

      return content;
    } catch (error) {
      lastError = error;
      tried.push(model);

      // Only a missing deployment is worth trying the next candidate for.
      // Anything else (auth, rate limit, bad request) will fail identically
      // on every model, so surface it immediately instead of masking it.
      const message = error instanceof Error ? error.message : String(error);
      if (message.includes("DeploymentNotFound")) continue;

      throw error;
    }
  }

  throw new Error(
    `No model deployment was reachable on this Azure AI Foundry resource. Tried: ${tried.join(", ")}. ` +
      `Deploy one of these in Azure AI Foundry, or set CLAUDE_MODEL to a deployment that exists. ` +
      (lastError instanceof Error ? `Last error: ${lastError.message}` : "")
  );
}
