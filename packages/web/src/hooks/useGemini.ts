import { useState, useCallback } from 'react';
import { AIService } from '../services/aiService.js';
import { GrantInputData, GrantProposalData } from '../types/grantProposalDataSchema.js';
import { CustomPrompts } from '../components/PromptCustomization.js';

export interface UseGeminiResult {
  generateProposal: (input: GrantInputData, customPrompts?: CustomPrompts) => Promise<void>;
  loadSessionData: (data: GrantProposalData) => void;
  data: GrantProposalData | null;
  isLoading: boolean;
  error: string | null;
  clearError: () => void;
}

export function useGemini(apiKey: string | null): UseGeminiResult {
  const [data, setData] = useState<GrantProposalData | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const generateProposal = useCallback(async (input: GrantInputData, customPrompts?: CustomPrompts) => {
    if (!apiKey) {
      setError('Google Gemini API key is not configured');
      return;
    }

    setIsLoading(true);
    setError(null);
    
    try {
      const aiService = new AIService(apiKey);
      const result = await aiService.generateGrantProposal(input, customPrompts);
      setData(result);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'An unknown error occurred';
      setError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  }, [apiKey]);

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  const loadSessionData = useCallback((sessionData: GrantProposalData) => {
    setData(sessionData);
    setError(null);
  }, []);

  return {
    generateProposal,
    loadSessionData,
    data,
    isLoading,
    error,
    clearError
  };
}