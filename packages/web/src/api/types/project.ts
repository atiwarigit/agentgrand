export interface Project {
  id: string
  name: string
  description: string
  owner_id: string
  organization_id?: string
  status: 'draft' | 'in_progress' | 'completed' | 'submitted'
  grant_data: GrantData
  regenerations_used: number
  max_regenerations: number
  created_at: string
  updated_at: string
  owner_name?: string
  owner_email?: string
  collaborators?: ProjectCollaborator[]
}

export interface ProjectCollaborator {
  id: string
  name: string
  email: string
  role: 'owner' | 'editor' | 'viewer'
  invited_at: string
  accepted_at?: string
}

export interface GrantData {
  summary?: string
  deadlines?: Array<{
    task: string
    date: string
    completed: boolean
  }>
  eligibility?: Array<{
    requirement: string
    status: 'met' | 'not_met' | 'pending'
    notes?: string
  }>
  sections?: {
    need?: string
    projectPlan?: string
    budgetNarrative?: string
    outcomes?: string
  }
  compliance?: {
    pageLimit: { current: number; max: number }
    wordLimit: { current: number; max: number }
    requiredAttachments: Array<{
      name: string
      required: boolean
      uploaded: boolean
      filename?: string
    }>
    deadlineAlerts: Array<{
      message: string
      severity: 'info' | 'warning' | 'error'
      date: string
    }>
  }
  kpiSuggestions?: Array<{
    category: string
    metric: string
    target: string
    measurement: string
  }>
}

export interface ProcessingJob {
  id: string
  project_id: string
  user_id: string
  job_type: 'ingest' | 'draft' | 'regenerate'
  status: 'queued' | 'processing' | 'completed' | 'failed'
  progress: {
    stage: string
    percentage: number
  }
  input_data: Record<string, any>
  result?: Record<string, any>
  error_message?: string
  started_at?: string
  completed_at?: string
  created_at: string
}