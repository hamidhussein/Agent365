import { GoogleGenAI } from "@google/genai";
import { NewAgentData } from "../types";

const API_KEY = process.env.API_KEY;

if (!API_KEY) {
  throw new Error("API_KEY environment variable not set");
}

const ai = new GoogleGenAI({ apiKey: API_KEY });

function buildPrompt(systemPrompt: string, userInputs: Record<string, any>): string {
  let prompt = systemPrompt;
  prompt += "\n\nUser provided the following inputs:\n";
  for (const [key, value] of Object.entries(userInputs)) {
    const formattedKey = key.replace(/_/g, ' ');
    prompt += `- ${formattedKey}: ${value}\n`;
  }
  prompt += "\nNow, generate the result based on these inputs.";
  return prompt;
}


export async function* runAgentStream(
  llmConfig: NewAgentData['llmConfig'],
  userInputs: Record<string, any>
): AsyncGenerator<string> {

  const model = llmConfig.model || 'gemini-2.5-flash';
  const fullPrompt = buildPrompt(llmConfig.systemPrompt, userInputs);

  try {
    const response = await ai.models.generateContentStream({
      model,
      contents: fullPrompt,
      config: {
        systemInstruction: llmConfig.systemPrompt,
      }
    });

    for await (const chunk of response) {
      // Ensure we are getting text and not function calls or other data
      const text = chunk.text;
      if (text) {
        yield text;
      }
    }
  } catch (error) {
    console.error("Error running agent:", error);
    yield "An error occurred while running the agent. Please check the console for details.";
  }
}
