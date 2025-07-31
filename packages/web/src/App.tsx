// @ts-ignore
import React from 'react';
import { AppConfigProvider } from './contexts/AppConfigProvider.js';
import { ThemeProvider } from './contexts/ThemeProvider.js';
import { GrantInputForm } from './components/GrantInputForm.js';
import { GrantOutputDisplay } from './components/GrantOutputDisplay.js';
import { ThemeToggle } from './components/ThemeToggle.js';
import { SettingsPanel } from './components/SettingsPanel.js';
import { useGemini } from './hooks/useGemini.js';
import { useAppConfig } from './contexts/AppConfigProvider.js';
import { GrantInputData } from './types/grantProposalDataSchema.js';
import { CustomPrompts } from './components/PromptCustomization.js';

function AppContent() {
  const { geminiApiKey } = useAppConfig();
  const { generateProposal, loadSessionData, data, isLoading, error, clearError } = useGemini(geminiApiKey);
  const [currentInputData, setCurrentInputData] = React.useState<GrantInputData | null>(null);
  const [customPrompts, setCustomPrompts] = React.useState<CustomPrompts>(() => {
    try {
      const saved = localStorage.getItem('grant-writer-custom-prompts');
      return saved ? JSON.parse(saved) : {};
    } catch {
      return {};
    }
  });

  const handleFormSubmit = (inputData: GrantInputData) => {
    clearError();
    setCurrentInputData(inputData);
    generateProposal(inputData, customPrompts);
  };

  const handlePromptsChange = (prompts: CustomPrompts) => {
    setCustomPrompts(prompts);
    try {
      localStorage.setItem('grant-writer-custom-prompts', JSON.stringify(prompts));
    } catch (error) {
      console.error('Failed to save custom prompts:', error);
    }
  };

  const handleLoadSession = (inputData: GrantInputData, proposalData: GrantProposalData) => {
    clearError();
    setCurrentInputData(inputData);
    loadSessionData(proposalData);
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 transition-colors">
      {/* Header */}
      <header className="bg-white dark:bg-gray-800 shadow-sm border-b border-gray-200 dark:border-gray-700">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center space-x-3">
              <div className="text-2xl">🏛️</div>
              <div>
                <h1 className="text-lg sm:text-xl font-bold text-gray-900 dark:text-white">Grant-Writer Agent</h1>
                <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400">CityNet Grant Proposal Assistant</p>
              </div>
            </div>
            <div className="flex items-center space-x-2 sm:space-x-4">
              <div className="hidden sm:block text-sm text-gray-500 dark:text-gray-400">
                Powered by Google Gemini AI
              </div>
              <ThemeToggle />
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 lg:gap-8">
          {/* Left Column - Input Form */}
          <div>
            <GrantInputForm 
              onSubmit={handleFormSubmit}
              isLoading={isLoading}
            />
          </div>

          {/* Right Column - Output Display */}
          <div>
            <GrantOutputDisplay 
              data={data}
              error={error}
              isLoading={isLoading}
              inputData={currentInputData}
              onLoadSession={handleLoadSession}
            />
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700 mt-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex flex-col sm:flex-row items-center justify-between space-y-2 sm:space-y-0">
            <div className="text-xs sm:text-sm text-gray-500 dark:text-gray-400 text-center sm:text-left">
              © 2024 CityNet Grant-Writer Agent. Built with React & Google Gemini AI.
            </div>
            <div className="flex items-center space-x-2 sm:space-x-4 text-xs sm:text-sm text-gray-500 dark:text-gray-400">
              <span>Version 1.0</span>
              <span>•</span>
              <span>In Development</span>
            </div>
          </div>
        </div>
      </footer>

      {/* Settings Panel */}
      <SettingsPanel
        onPromptsChange={handlePromptsChange}
        customPrompts={customPrompts}
      />
    </div>
  );
}

export default function App() {
  return (
    <AppConfigProvider>
      <ThemeProvider>
        <AppContent />
      </ThemeProvider>
    </AppConfigProvider>
  );
}