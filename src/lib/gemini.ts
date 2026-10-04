/**
 * Google Gemini AI integration for Employee Management System.
 * Supports gemini-1.5-flash and gemini-2.0-flash via Google Generative Language API.
 */

interface GeminiContent {
  role?: 'user' | 'model';
  parts: Array<{ text: string }>;
}

interface GeminiGenerateConfig {
  temperature?: number;
  maxOutputTokens?: number;
  topP?: number;
  topK?: number;
}

interface GenerateGeminiOptions {
  prompt: string;
  systemInstruction?: string;
  model?: string;
  config?: GeminiGenerateConfig;
}

/**
 * Get the active Gemini API key from environment variables.
 */
export function getGeminiApiKey(): string | null {
  return (
    process.env.GEMINI_API_KEY ||
    process.env.GOOGLE_API_KEY ||
    process.env.GOOGLE_GENAI_API_KEY ||
    null
  );
}

/**
 * Call Google Gemini to generate content.
 * Returns the text response from the model.
 * If no API key is provided, returns null so the caller can fall back to computed data.
 */
export async function generateGeminiContent({
  prompt,
  systemInstruction,
  model = process.env.GEMINI_MODEL || 'gemini-1.5-flash',
  config = { temperature: 0.4, maxOutputTokens: 1024 },
}: GenerateGeminiOptions): Promise<string | null> {
  const apiKey = getGeminiApiKey();

  if (!apiKey || apiKey === 'your_gemini_api_key_here') {
    return null;
  }

  const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;

  const requestBody: {
    contents: GeminiContent[];
    system_instruction?: { parts: Array<{ text: string }> };
    generationConfig?: GeminiGenerateConfig;
  } = {
    contents: [
      {
        role: 'user',
        parts: [{ text: prompt }],
      },
    ],
    generationConfig: config,
  };

  if (systemInstruction) {
    requestBody.system_instruction = {
      parts: [{ text: systemInstruction }],
    };
  }

  const res = await fetch(endpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(requestBody),
  });

  if (!res.ok) {
    const errorText = await res.text().catch(() => '');
    throw new Error(`Google Gemini API error (${res.status}): ${errorText}`);
  }

  const json = await res.json();
  const text = json.candidates?.[0]?.content?.parts?.[0]?.text;

  return text || null;
}
