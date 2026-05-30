import OpenAI from "openai";

if (!process.env.GITHUB_MODELS_TOKEN) {
  throw new Error("GITHUB_MODELS_TOKEN is not set in environment variables");
}

const client = new OpenAI({
  baseURL: "https://models.inference.ai.azure.com",
  apiKey: process.env.GITHUB_MODELS_TOKEN,
});

export const CLAUDE_MODEL = "gpt-4o-mini";

export async function generateWithClaude(
  systemPrompt: string,
  userPrompt: string,
  maxTokens: number = 2000
): Promise<string> {
  const response = await client.chat.completions.create({
    model: CLAUDE_MODEL,
    max_tokens: maxTokens,
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user", content: userPrompt },
    ],
  });

  const content = response.choices[0]?.message?.content;

  if (!content) {
    throw new Error("No response content from GitHub Models");
  }

  return content;
}