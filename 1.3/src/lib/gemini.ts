import { GoogleGenAI } from '@google/genai';

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

export async function checkContent(base64Image: string, mimeType: string): Promise<boolean> {
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: {
        parts: [
          {
            inlineData: {
              data: base64Image.split(',')[1], // Remove data:image/jpeg;base64, prefix
              mimeType,
            },
          },
          {
            text: 'Analyze this image. Does it contain nudity, sexual content, gore, violence, drugs, or propaganda? Reply strictly with YES or NO.',
          },
        ],
      },
    });
    const text = response.text?.trim().toUpperCase() || '';
    return text.includes('YES');
  } catch (error) {
    console.error('Content moderation error:', error);
    return true; // Reject on error to be safe
  }
}
