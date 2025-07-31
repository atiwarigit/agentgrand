// @ts-ignore
import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';

interface AppConfig {
  geminiApiKey: string | null;
  apiKeyMissing: boolean;
}

interface AppConfigContextType extends AppConfig {
  setGeminiApiKey: (key: string) => void;
}

const AppConfigContext = createContext<AppConfigContextType | undefined>(undefined);

interface AppConfigProviderProps {
  children: ReactNode;
}

export function AppConfigProvider({ children }: AppConfigProviderProps) {
  const [geminiApiKey, setGeminiApiKeyState] = useState<string | null>(null);
  const [apiKeyMissing, setApiKeyMissing] = useState(true);

  useEffect(() => {
    // Try to get API key from environment variables or localStorage
    const envApiKey = import.meta.env?.VITE_GEMINI_API_KEY;
    const localApiKey = localStorage.getItem('gemini_api_key');
    
    const apiKey = envApiKey || localApiKey;
    
    if (apiKey) {
      setGeminiApiKeyState(apiKey);
      setApiKeyMissing(false);
    } else {
      // Prompt user for API key if not found
      const userApiKey = prompt(
        'Please enter your Google Gemini API key:\n\n' +
        'You can get one from: https://aistudio.google.com/app/apikey\n\n' +
        'This will be stored locally in your browser.'
      );
      
      if (userApiKey) {
        setGeminiApiKeyState(userApiKey);
        localStorage.setItem('gemini_api_key', userApiKey);
        setApiKeyMissing(false);
      }
    }
  }, []);

  const setGeminiApiKey = (key: string) => {
    setGeminiApiKeyState(key);
    localStorage.setItem('gemini_api_key', key);
    setApiKeyMissing(false);
  };

  const value: AppConfigContextType = {
    geminiApiKey,
    apiKeyMissing,
    setGeminiApiKey,
  };

  return (
    <AppConfigContext.Provider value={value}>
      {children}
    </AppConfigContext.Provider>
  );
}

export function useAppConfig(): AppConfigContextType {
  const context = useContext(AppConfigContext);
  if (context === undefined) {
    throw new Error('useAppConfig must be used within an AppConfigProvider');
  }
  return context;
}