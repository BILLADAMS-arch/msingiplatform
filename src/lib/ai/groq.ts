import Groq from "groq-sdk";

export const TUTOR_MODEL = "openai/gpt-oss-120b";

export function createGroqClient() {
  return new Groq({ apiKey: process.env.GROQ_API_KEY });
}
