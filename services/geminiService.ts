
import { GoogleGenAI, GenerateContentResponse, Chat } from "@google/genai";

export type IbrahimModel = 'ibrahim-2.5-pro' | 'ibrahim-3-flash' | 'ibrahim-3-thinking' | 'ibrahim-image-maker';

export class GeminiChatService {
  private ai: GoogleGenAI;

  constructor() {
    this.ai = new GoogleGenAI({ apiKey: process.env.API_KEY || '' });
  }

  async *sendMessageStream(
    message: string, 
    modelId: IbrahimModel,
    attachment?: { data: string, mimeType: string }
  ) {
    try {
      let parts: any[] = [{ text: message }];
      
      if (attachment) {
        parts.push({
          inlineData: {
            data: attachment.data,
            mimeType: attachment.mimeType
          }
        });
      }

      const modelConfig: any = {
        model: '',
        config: {
          systemInstruction: 'You are Ibrahim AI Pro, a sophisticated AI assistant. Respond in the requested language (Bengali or English).'
        }
      };

      // Map Ibrahim Models to Gemini Models
      switch (modelId) {
        case 'ibrahim-2.5-pro':
          modelConfig.model = 'gemini-3-pro-preview';
          break;
        case 'ibrahim-3-flash':
          modelConfig.model = 'gemini-3-flash-preview';
          break;
        case 'ibrahim-3-thinking':
          modelConfig.model = 'gemini-3-pro-preview';
          modelConfig.config.thinkingConfig = { thinkingBudget: 32768 };
          break;
        case 'ibrahim-image-maker':
          modelConfig.model = 'gemini-2.5-flash-image';
          modelConfig.config.systemInstruction = 'You are Ibrahim Image Maker. You generate images based on text descriptions.';
          break;
        default:
          modelConfig.model = 'gemini-3-flash-preview';
      }

      if (modelId === 'ibrahim-image-maker') {
        // Image generation is not streamed usually, but we yield once
        const response = await this.ai.models.generateContent({
          model: modelConfig.model,
          contents: [{ role: 'user', parts }],
          config: modelConfig.config
        });

        for (const part of response.candidates[0].content.parts) {
          if (part.inlineData) {
            const base64Data = part.inlineData.data;
            const mimeType = part.inlineData.mimeType;
            yield `IMAGE_GENERATED:data:${mimeType};base64,${base64Data}`;
          } else if (part.text) {
            yield part.text;
          }
        }
        return;
      }

      const stream = await this.ai.models.generateContentStream({
        model: modelConfig.model,
        contents: [{ role: 'user', parts }],
        config: modelConfig.config
      });

      for await (const chunk of stream) {
        const text = (chunk as GenerateContentResponse).text;
        if (text) yield text;
      }
    } catch (error) {
      console.error("Gemini Stream Error:", error);
      yield "দুঃখিত, কোনো একটি সমস্যা হয়েছে। দয়া করে আবার চেষ্টা করুন।";
    }
  }
}
