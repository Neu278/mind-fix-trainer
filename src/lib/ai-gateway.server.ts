import { createGoogleGenerativeAI } from "@ai-sdk/google";

export function getGeminiProvider() {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error("GEMINI_API_KEY가 .env 파일에 설정되어 있지 않습니다.");
  }
  return createGoogleGenerativeAI({
    apiKey,
  });
}

