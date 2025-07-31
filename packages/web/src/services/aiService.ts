// @ts-ignore
import { GoogleGenerativeAI } from '@google/generative-ai';
import { GrantInputData, GrantProposalData } from '../types/grantProposalDataSchema.js';
import { buildGrantProposalPrompt } from '../utils/promptBuilder.js';
import { validateGrantProposalData } from '../utils/responseValidator.js';
import { CustomPrompts } from '../components/PromptCustomization.js';

export class AIService {
  private genAI: GoogleGenerativeAI;
  private model: any;

  constructor(apiKey: string) {
    this.genAI = new GoogleGenerativeAI(apiKey);
    this.model = this.genAI.getGenerativeModel({ 
      model: "gemini-2.0-flash-exp",
      generationConfig: {
        temperature: 0.7,
        topK: 40,
        topP: 0.95,
        maxOutputTokens: 8192,
      }
    });
  }

  async generateGrantProposal(input: GrantInputData, customPrompts?: CustomPrompts): Promise<GrantProposalData> {
    try {
      const prompt = buildGrantProposalPrompt(input, customPrompts);
      
      const result = await this.model.generateContent(prompt);
      const response = await result.response;
      const text = response.text();

      // Clean up the response text to extract JSON
      let cleanedText = text.trim();
      
      // Remove any markdown code blocks
      if (cleanedText.startsWith('```json')) {
        cleanedText = cleanedText.slice(7);
      }
      if (cleanedText.startsWith('```')) {
        cleanedText = cleanedText.slice(3);
      }
      if (cleanedText.endsWith('```')) {
        cleanedText = cleanedText.slice(0, -3);
      }
      
      cleanedText = cleanedText.trim();

      let parsedResponse;
      try {
        parsedResponse = JSON.parse(cleanedText);
      } catch (parseError) {
        throw new Error(`Failed to parse AI response as JSON: ${parseError}`);
      }

      // Validate the response structure
      const validatedData = validateGrantProposalData(parsedResponse);
      return validatedData;

    } catch (error) {
      if (error instanceof Error) {
        throw new Error(`AI Service Error: ${error.message}`);
      }
      throw new Error('Unknown error occurred in AI service');
    }
  }
}