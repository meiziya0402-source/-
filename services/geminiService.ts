import { GoogleGenAI, Type } from "@google/genai";

const apiKey = process.env.API_KEY || '';

// Initialize only if key exists to avoid immediate crash on load, handled inside function
let ai: GoogleGenAI | null = null;
if (apiKey) {
  ai = new GoogleGenAI({ apiKey });
}

interface GeneratedCopy {
  title: string;
  description: string;
  tags: string[];
}

export const generateVideoCopy = async (
  topic: string, 
  platformName: string,
  tone: string = 'Engaging'
): Promise<GeneratedCopy> => {
  if (!ai) {
    throw new Error("API Key missing");
  }

  const prompt = `
    You are a professional social media manager. 
    Write a viral video title, description, and tags for a video about: "${topic}".
    Target Platform: ${platformName}.
    Tone: ${tone}.
    Language: Chinese (Simplified).
    
    Return JSON format.
  `;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            title: { type: Type.STRING },
            description: { type: Type.STRING },
            tags: { 
              type: Type.ARRAY,
              items: { type: Type.STRING }
            }
          },
          required: ["title", "description", "tags"]
        }
      }
    });

    if (response.text) {
      return JSON.parse(response.text) as GeneratedCopy;
    }
    throw new Error("Empty response from AI");
  } catch (error) {
    console.error("Gemini AI generation failed:", error);
    throw error;
  }
};