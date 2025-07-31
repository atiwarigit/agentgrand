// @ts-ignore
import React, { useState, useCallback } from 'react';

export interface CustomPrompts {
  overallSummaryPrompt?: string;
  draftSectionPrompt?: string;
  kpiPrompt?: string;
  compliancePrompt?: string;
  customInstructions?: string;
}

interface PromptCustomizationProps {
  onPromptsChange: (prompts: CustomPrompts) => void;
  initialPrompts?: CustomPrompts;
}

const DEFAULT_PROMPTS = {
  overallSummaryPrompt: 'Analyze the RFP and provide a comprehensive summary focusing on key requirements, objectives, and strategic approach.',
  draftSectionPrompt: 'Generate detailed draft content for each required section, ensuring alignment with RFP requirements and organizational context.',
  kpiPrompt: 'Suggest relevant KPIs and metrics that align with the grant requirements and demonstrate organizational capacity.',
  compliancePrompt: 'Create a comprehensive compliance checklist covering all RFP requirements, deadlines, and submission criteria.',
  customInstructions: 'Additional context or specific requirements for the AI to consider when generating the proposal.'
};

export function PromptCustomization({ onPromptsChange, initialPrompts }: PromptCustomizationProps) {
  const [prompts, setPrompts] = useState<CustomPrompts>(initialPrompts || {});
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);

  const handlePromptChange = useCallback((field: keyof CustomPrompts, value: string) => {
    const newPrompts = { ...prompts, [field]: value };
    setPrompts(newPrompts);
    setHasChanges(true);
  }, [prompts]);

  const handleSaveChanges = useCallback(() => {
    onPromptsChange(prompts);
    setHasChanges(false);
  }, [prompts, onPromptsChange]);

  const handleResetToDefaults = useCallback(() => {
    setPrompts(DEFAULT_PROMPTS);
    setHasChanges(true);
  }, []);

  const handleClearCustomizations = useCallback(() => {
    setPrompts({});
    setHasChanges(true);
  }, []);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold text-gray-900">Prompt Customization</h3>
          <p className="text-sm text-gray-600">Customize AI prompts to better align with your organization's needs</p>
        </div>
        <button
          onClick={() => setShowAdvanced(!showAdvanced)}
          className="text-sm text-blue-600 hover:text-blue-700 font-medium"
        >
          {showAdvanced ? 'Hide Advanced' : 'Show Advanced'}
        </button>
      </div>

      {/* Basic Customizations */}
      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Custom Instructions
          </label>
          <textarea
            value={prompts.customInstructions || ''}
            onChange={(e) => handlePromptChange('customInstructions', e.target.value)}
            placeholder={DEFAULT_PROMPTS.customInstructions}
            className="w-full p-3 border border-gray-300 rounded-lg resize-vertical min-h-[100px]"
            rows={4}
          />
          <p className="text-xs text-gray-500 mt-1">
            Add specific context, requirements, or instructions for the AI to consider.
          </p>
        </div>
      </div>

      {/* Advanced Customizations */}
      {showAdvanced && (
        <div className="space-y-4 border-t pt-4">
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
            <div className="text-sm text-amber-800">
              <strong>Advanced Settings:</strong> Modify these prompts to fine-tune AI behavior. Changes affect the quality and focus of generated content.
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Overall Summary Prompt
            </label>
            <textarea
              value={prompts.overallSummaryPrompt || ''}
              onChange={(e) => handlePromptChange('overallSummaryPrompt', e.target.value)}
              placeholder={DEFAULT_PROMPTS.overallSummaryPrompt}
              className="w-full p-3 border border-gray-300 rounded-lg resize-vertical min-h-[80px]"
              rows={3}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Draft Section Prompt
            </label>
            <textarea
              value={prompts.draftSectionPrompt || ''}
              onChange={(e) => handlePromptChange('draftSectionPrompt', e.target.value)}
              placeholder={DEFAULT_PROMPTS.draftSectionPrompt}
              className="w-full p-3 border border-gray-300 rounded-lg resize-vertical min-h-[80px]"
              rows={3}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              KPI Generation Prompt
            </label>
            <textarea
              value={prompts.kpiPrompt || ''}
              onChange={(e) => handlePromptChange('kpiPrompt', e.target.value)}
              placeholder={DEFAULT_PROMPTS.kpiPrompt}
              className="w-full p-3 border border-gray-300 rounded-lg resize-vertical min-h-[80px]"
              rows={3}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Compliance Checklist Prompt
            </label>
            <textarea
              value={prompts.compliancePrompt || ''}
              onChange={(e) => handlePromptChange('compliancePrompt', e.target.value)}
              placeholder={DEFAULT_PROMPTS.compliancePrompt}
              className="w-full p-3 border border-gray-300 rounded-lg resize-vertical min-h-[80px]"
              rows={3}
            />
          </div>
        </div>
      )}

      {/* Action Buttons */}
      <div className="flex flex-wrap gap-3 pt-4 border-t">
        <button
          onClick={handleSaveChanges}
          disabled={!hasChanges}
          className="bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white px-4 py-2 rounded-lg font-medium transition-colors"
        >
          Save Changes
        </button>
        <button
          onClick={handleResetToDefaults}
          className="bg-gray-600 hover:bg-gray-700 text-white px-4 py-2 rounded-lg font-medium transition-colors"
        >
          Reset to Defaults
        </button>
        <button
          onClick={handleClearCustomizations}
          className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg font-medium transition-colors"
        >
          Clear All
        </button>
      </div>

      {hasChanges && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
          <div className="text-sm text-blue-800">
            You have unsaved changes. Click "Save Changes" to apply your customizations.
          </div>
        </div>
      )}
    </div>
  );
}