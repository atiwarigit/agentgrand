export interface RfpSnapshot {
  submissionDeadline: string;
  clarificationDeadline: string;
  eligibilityRules: string[];
  narrativePrompts: string[];
}

export interface DraftSection {
  id: string;
  title: string;
  content: string;
}

export interface KpiItem {
  metric: string;
  value: string;
  source: string;
}

export interface ComplianceItem {
  id: string;
  requirement: string;
  status: 'pending' | 'ok' | 'needs-attention';
  notes?: string;
}

export interface GrantProposalData {
  overallSummary: string;
  rfpSnapshot: RfpSnapshot;
  draftSections: DraftSection[];
  kpis: KpiItem[];
  complianceChecklist: ComplianceItem[];
}

export interface GrantInputData {
  rfpFile: File | null;
  rfpContent: string;
  grantTitle: string;
  citynetContext: string;
  targetProgram?: string;
}