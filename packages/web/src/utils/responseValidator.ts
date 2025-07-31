import { GrantProposalData } from '../types/grantProposalDataSchema.js';

export function validateGrantProposalData(data: any): GrantProposalData {
  if (typeof data !== 'object' || data === null) {
    throw new Error('Invalid response: Expected object');
  }

  if (typeof data.overallSummary !== 'string') {
    throw new Error('Invalid response: overallSummary must be a string');
  }

  if (!data.rfpSnapshot || typeof data.rfpSnapshot !== 'object') {
    throw new Error('Invalid response: rfpSnapshot must be an object');
  }

  const rfpSnapshot = data.rfpSnapshot;
  if (typeof rfpSnapshot.submissionDeadline !== 'string' ||
      typeof rfpSnapshot.clarificationDeadline !== 'string' ||
      !Array.isArray(rfpSnapshot.eligibilityRules) ||
      !Array.isArray(rfpSnapshot.narrativePrompts)) {
    throw new Error('Invalid response: rfpSnapshot has invalid structure');
  }

  if (!Array.isArray(data.draftSections)) {
    throw new Error('Invalid response: draftSections must be an array');
  }

  if (!Array.isArray(data.kpis)) {
    throw new Error('Invalid response: kpis must be an array');
  }

  if (!Array.isArray(data.complianceChecklist)) {
    throw new Error('Invalid response: complianceChecklist must be an array');
  }

  // Validate draft sections
  data.draftSections.forEach((section: any, index: number) => {
    if (!section.id || !section.title || !section.content) {
      throw new Error(`Invalid response: draftSections[${index}] missing required fields`);
    }
  });

  // Validate KPIs
  data.kpis.forEach((kpi: any, index: number) => {
    if (!kpi.metric || !kpi.value || !kpi.source) {
      throw new Error(`Invalid response: kpis[${index}] missing required fields`);
    }
  });

  // Validate compliance checklist
  data.complianceChecklist.forEach((item: any, index: number) => {
    if (!item.id || !item.requirement || !item.status) {
      throw new Error(`Invalid response: complianceChecklist[${index}] missing required fields`);
    }
    if (!['pending', 'ok', 'needs-attention'].includes(item.status)) {
      throw new Error(`Invalid response: complianceChecklist[${index}] has invalid status`);
    }
  });

  return data as GrantProposalData;
}