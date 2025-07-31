// @ts-ignore
import React, { useState, useCallback } from 'react';
import { FileUpload } from './FileUpload.js';
import { GrantInputData } from '../types/grantProposalDataSchema.js';
import { useAppConfig } from '../contexts/AppConfigProvider.js';

interface GrantInputFormProps {
  onSubmit: (data: GrantInputData) => void;
  isLoading: boolean;
}

const TARGET_PROGRAMS = [
  { value: '', label: 'Select a program (optional)' },
  { value: 'HUD ROSS', label: 'HUD Resident Opportunity and Supportive Services' },
  { value: 'HUD Jobs Plus', label: 'HUD Jobs Plus' },
  { value: 'HUD Choice Neighborhoods', label: 'HUD Choice Neighborhoods' },
  { value: 'HUD Community Development Block Grant', label: 'Community Development Block Grant (CDBG)' },
  { value: 'HUD HOME', label: 'HOME Investment Partnerships Program' },
  { value: 'Other Housing', label: 'Other Housing Program' },
  { value: 'Workforce Development', label: 'Workforce Development' },
  { value: 'Education', label: 'Education/Youth Programs' },
  { value: 'Health Services', label: 'Health & Social Services' },
];

export function GrantInputForm({ onSubmit, isLoading }: GrantInputFormProps) {
  const { apiKeyMissing } = useAppConfig();
  const [formData, setFormData] = useState<GrantInputData>({
    rfpFile: null,
    rfpContent: '',
    grantTitle: '',
    citynetContext: '',
    targetProgram: '',
  });

  const handleFileProcessed = useCallback((file: File, content: string) => {
    setFormData(prev => ({
      ...prev,
      rfpFile: file,
      rfpContent: content,
    }));
  }, []);

  const handleInputChange = useCallback((field: keyof GrantInputData, value: string) => {
    setFormData(prev => ({
      ...prev,
      [field]: value,
    }));
  }, []);

  const handleSubmit = useCallback((e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(formData);
  }, [formData, onSubmit]);

  const isFormValid = formData.rfpFile && formData.grantTitle.trim() && formData.citynetContext.trim();

  return (
    <div className="bg-white rounded-lg shadow-lg p-6">
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Grant Proposal Input</h2>
        <p className="text-gray-600">
          Provide the RFP document and context to generate comprehensive grant proposal assistance.
        </p>
      </div>

      {apiKeyMissing && (
        <div className="mb-6 bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="flex items-center space-x-2">
            <span className="text-red-500">⚠</span>
            <div className="text-red-800">
              <div className="font-medium">API Key Required</div>
              <div className="text-sm">
                Google Gemini API key is required to generate proposals. Please refresh the page to enter your API key.
              </div>
            </div>
          </div>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            RFP Document <span className="text-red-500">*</span>
          </label>
          <FileUpload
            onFileProcessed={handleFileProcessed}
            disabled={isLoading}
          />
        </div>

        <div>
          <label htmlFor="grantTitle" className="block text-sm font-medium text-gray-700 mb-2">
            Grant Title <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            id="grantTitle"
            value={formData.grantTitle}
            onChange={(e) => handleInputChange('grantTitle', e.target.value)}
            disabled={isLoading}
            placeholder="Enter the official name of the grant opportunity"
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 disabled:bg-gray-50"
          />
        </div>

        <div>
          <label htmlFor="targetProgram" className="block text-sm font-medium text-gray-700 mb-2">
            Target Program Focus
          </label>
          <select
            id="targetProgram"
            value={formData.targetProgram}
            onChange={(e) => handleInputChange('targetProgram', e.target.value)}
            disabled={isLoading}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 disabled:bg-gray-50"
          >
            {TARGET_PROGRAMS.map((program) => (
              <option key={program.value} value={program.value}>
                {program.label}
              </option>
            ))}
          </select>
          <p className="mt-1 text-sm text-gray-500">
            Select if this grant targets a specific program type for more tailored assistance.
          </p>
        </div>

        <div>
          <label htmlFor="citynetContext" className="block text-sm font-medium text-gray-700 mb-2">
            CityNet Context & Past Proposal Snippets <span className="text-red-500">*</span>
          </label>
          <textarea
            id="citynetContext"
            value={formData.citynetContext}
            onChange={(e) => handleInputChange('citynetContext', e.target.value)}
            disabled={isLoading}
            rows={8}
            placeholder="Provide key organizational information, statistics, program details, and any relevant content from past successful proposals that could be adapted for this grant..."
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 disabled:bg-gray-50 resize-none"
          />
          <p className="mt-1 text-sm text-gray-500">
            Include organizational KPIs, past project successes, target demographics, service areas, and any boilerplate text that could be reused.
          </p>
        </div>

        <button
          type="submit"
          disabled={!isFormValid || isLoading || apiKeyMissing}
          className="w-full bg-primary-600 text-white py-3 px-4 rounded-lg font-medium hover:bg-primary-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors flex items-center justify-center space-x-2"
        >
          {isLoading ? (
            <>
              <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
              <span>Generating...</span>
            </>
          ) : (
            <span>Generate Grant Proposal Aid</span>
          )}
        </button>
      </form>
    </div>
  );
}