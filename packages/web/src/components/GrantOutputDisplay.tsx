// @ts-ignore
import React, { useState, useCallback } from 'react';
import { GrantProposalData, DraftSection, ComplianceItem, GrantInputData } from '../types/grantProposalDataSchema.js';
import { SectionCard } from './SectionCard.js';
import { DraftEditor } from './DraftEditor.js';
import { ComplianceChecklist } from './ComplianceChecklist.js';
import { SaveLoadManager } from './SaveLoadManager.js';
import { ExportService } from '../services/exportService.js';

interface GrantOutputDisplayProps {
  data: GrantProposalData | null;
  error: string | null;
  isLoading: boolean;
  inputData?: GrantInputData | null;
  onLoadSession?: (inputData: GrantInputData, proposalData: GrantProposalData) => void;
}

export function GrantOutputDisplay({ data, error, isLoading, inputData, onLoadSession }: GrantOutputDisplayProps) {
  const [draftSections, setDraftSections] = useState<DraftSection[]>([]);
  const [complianceItems, setComplianceItems] = useState<ComplianceItem[]>([]);

  // Update local state when data changes
  React.useEffect(() => {
    if (data) {
      setDraftSections(data.draftSections);
      setComplianceItems(data.complianceChecklist);
    }
  }, [data]);

  const handleSaveDraft = useCallback((sectionId: string, newContent: string) => {
    setDraftSections(prev => 
      prev.map(section => 
        section.id === sectionId 
          ? { ...section, content: newContent }
          : section
      )
    );
  }, []);

  const handleUpdateComplianceStatus = useCallback((itemId: string, status: ComplianceItem['status']) => {
    setComplianceItems(prev =>
      prev.map(item =>
        item.id === itemId
          ? { ...item, status }
          : item
      )
    );
  }, []);

  const handleUpdateComplianceNotes = useCallback((itemId: string, notes: string) => {
    setComplianceItems(prev =>
      prev.map(item =>
        item.id === itemId
          ? { ...item, notes }
          : item
      )
    );
  }, []);

  const handleExportWord = useCallback(async () => {
    if (!data || !inputData) return;
    try {
      const updatedData = { ...data, draftSections, complianceChecklist: complianceItems };
      await ExportService.exportToWord(updatedData, inputData);
    } catch (error) {
      console.error('Export to Word failed:', error);
      alert('Export to Word failed. Please try again.');
    }
  }, [data, inputData, draftSections, complianceItems]);

  const handleExportPDF = useCallback(async () => {
    if (!data || !inputData) return;
    try {
      const updatedData = { ...data, draftSections, complianceChecklist: complianceItems };
      await ExportService.exportToPDF(updatedData, inputData);
    } catch (error) {
      console.error('Export to PDF failed:', error);
      alert('Export to PDF failed. Please try again.');
    }
  }, [data, inputData, draftSections, complianceItems]);

  const handleExportJSON = useCallback(() => {
    if (!data || !inputData) return;
    try {
      const updatedData = { ...data, draftSections, complianceChecklist: complianceItems };
      ExportService.exportToJSON(updatedData, inputData);
    } catch (error) {
      console.error('Export to JSON failed:', error);
      alert('Export to JSON failed. Please try again.');
    }
  }, [data, inputData, draftSections, complianceItems]);

  if (isLoading) {
    return (
      <div className="bg-white rounded-lg shadow-lg p-6">
        <div className="flex items-center justify-center py-12">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto mb-4"></div>
            <div className="text-lg font-medium text-gray-700">Generating Grant Proposal Aid...</div>
            <div className="text-sm text-gray-500 mt-1">This may take a few moments</div>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-white rounded-lg shadow-lg p-6">
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="flex items-start space-x-2">
            <span className="text-red-500 text-xl">⚠</span>
            <div>
              <div className="font-medium text-red-900">Generation Failed</div>
              <div className="text-sm text-red-700 mt-1">{error}</div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="bg-white rounded-lg shadow-lg p-6">
        <div className="text-center py-12">
          <div className="text-6xl mb-4">🚀</div>
          <div className="text-xl font-semibold text-gray-700 mb-2">
            Welcome to Grant-Writer Agent
          </div>
          <div className="text-gray-500 max-w-md mx-auto">
            Upload an RFP document and provide context to generate comprehensive grant proposal assistance. 
            The AI will analyze requirements and create draft content, compliance checklists, and strategic insights.
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Overall Summary */}
      <SectionCard title="Overall Summary" icon="📋" collapsible={false}>
        <div className="prose max-w-none">
          <p className="text-gray-700 leading-relaxed">{data.overallSummary}</p>
        </div>
      </SectionCard>

      {/* Export & Session Management */}
      <SectionCard title="Export & Session Management" icon="📥" collapsible={false}>
        <div className="space-y-4">
          {/* Export Options */}
          <div>
            <h4 className="font-medium text-gray-800 mb-3">Export Options</h4>
            <div className="flex flex-wrap gap-3">
              <button
                onClick={handleExportWord}
                disabled={!data || !inputData}
                className="flex items-center space-x-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white px-4 py-2 rounded-lg font-medium transition-colors"
              >
                <span>📄</span>
                <span>Export to Word</span>
              </button>
              <button
                onClick={handleExportPDF}
                disabled={!data || !inputData}
                className="flex items-center space-x-2 bg-red-600 hover:bg-red-700 disabled:bg-gray-400 text-white px-4 py-2 rounded-lg font-medium transition-colors"
              >
                <span>📑</span>
                <span>Export to PDF</span>
              </button>
              <button
                onClick={handleExportJSON}
                disabled={!data || !inputData}
                className="flex items-center space-x-2 bg-green-600 hover:bg-green-700 disabled:bg-gray-400 text-white px-4 py-2 rounded-lg font-medium transition-colors"
              >
                <span>💾</span>
                <span>Save as JSON</span>
              </button>
            </div>
          </div>
          
          {/* Session Management */}
          <div>
            <h4 className="font-medium text-gray-800 mb-3">Session Management</h4>
            <SaveLoadManager
              data={data ? { ...data, draftSections, complianceChecklist: complianceItems } : null}
              inputData={inputData}
              onLoadSession={onLoadSession || (() => {})}
            />
          </div>
          
          <div className="text-sm text-gray-600">
            Export your complete proposal with all edits and notes, save your session to continue later, or load a previous session.
          </div>
        </div>
      </SectionCard>

      {/* RFP Snapshot & Analysis */}
      <SectionCard title="RFP Snapshot & Analysis" icon="📊">
        <div className="grid md:grid-cols-2 gap-6">
          <div>
            <h4 className="font-semibold text-gray-800 mb-3">Key Deadlines</h4>
            <div className="space-y-2">
              <div className="flex justify-between items-center py-2 border-b border-gray-100">
                <span className="text-gray-600">Submission:</span>
                <span className="font-medium">{data.rfpSnapshot.submissionDeadline}</span>
              </div>
              <div className="flex justify-between items-center py-2 border-b border-gray-100">
                <span className="text-gray-600">Clarifications:</span>
                <span className="font-medium">{data.rfpSnapshot.clarificationDeadline}</span>
              </div>
            </div>
          </div>
          
          <div>
            <h4 className="font-semibold text-gray-800 mb-3">Eligibility Rules</h4>
            <ul className="space-y-1">
              {data.rfpSnapshot.eligibilityRules.map((rule, index) => (
                <li key={index} className="text-sm text-gray-700 flex items-start">
                  <span className="text-primary-500 mr-2">•</span>
                  {rule}
                </li>
              ))}
            </ul>
          </div>
        </div>

        <div className="mt-6">
          <h4 className="font-semibold text-gray-800 mb-3">Required Narrative Sections</h4>
          <ol className="space-y-1">
            {data.rfpSnapshot.narrativePrompts.map((prompt, index) => (
              <li key={index} className="text-sm text-gray-700 flex items-start">
                <span className="text-primary-500 mr-2 font-medium">{index + 1}.</span>
                {prompt}
              </li>
            ))}
          </ol>
        </div>
      </SectionCard>

      {/* AI-Generated Draft Sections */}
      <SectionCard title="AI-Generated Draft Sections" icon="✍️">
        <div className="space-y-4">
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <div className="text-sm text-blue-800">
              <strong>Note:</strong> These are initial drafts based on your RFP and context. 
              Click "Edit" on any section to customize the content. Changes are saved locally in your browser session.
            </div>
          </div>
          
          {draftSections.map((section) => (
            <DraftEditor
              key={section.id}
              section={section}
              onSave={handleSaveDraft}
            />
          ))}
        </div>
      </SectionCard>

      {/* Simulated KPIs & Evidence */}
      <SectionCard title="Suggested KPIs & Verifiable Evidence" icon="📈">
        <div className="space-y-4">
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
            <div className="text-sm text-amber-800">
              <strong>Usage Note:</strong> These are suggested metrics based on typical grant requirements. 
              Verify actual data availability and update values to reflect your organization's real performance.
            </div>
          </div>
          
          <div className="grid gap-4">
            {data.kpis.map((kpi, index) => (
              <div key={index} className="border border-gray-200 rounded-lg p-4">
                <div className="grid md:grid-cols-3 gap-3">
                  <div>
                    <div className="text-sm font-medium text-gray-600">Metric</div>
                    <div className="text-gray-900">{kpi.metric}</div>
                  </div>
                  <div>
                    <div className="text-sm font-medium text-gray-600">Value</div>
                    <div className="text-primary-600 font-semibold">{kpi.value}</div>
                  </div>
                  <div>
                    <div className="text-sm font-medium text-gray-600">Data Source</div>
                    <div className="text-gray-700 text-sm">{kpi.source}</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </SectionCard>

      {/* Compliance Guard Checklist */}
      <SectionCard title="Compliance Guard Checklist" icon="✅">
        <div className="space-y-4">
          <div className="bg-green-50 border border-green-200 rounded-lg p-4">
            <div className="text-sm text-green-800">
              <strong>Track Your Progress:</strong> Use this checklist to ensure all requirements are met. 
              Update status and add notes as you work through each compliance item.
            </div>
          </div>
          
          <ComplianceChecklist
            items={complianceItems}
            onUpdateStatus={handleUpdateComplianceStatus}
            onUpdateNotes={handleUpdateComplianceNotes}
          />
        </div>
      </SectionCard>
    </div>
  );
}