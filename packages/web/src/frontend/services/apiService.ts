import axios from 'axios'
import { Project, GrantData } from '../contexts/ProjectContext'

const API_BASE_URL = process.env.VITE_API_BASE_URL || 'http://localhost:8000'

const apiClient = axios.create({
  baseURL: `${API_BASE_URL}/api`,
  timeout: 30000,
})

apiClient.interceptors.request.use((config) => {
  const token = localStorage.getItem('accessToken')
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('accessToken')
      window.location.href = '/login'
    }
    return Promise.reject(error)
  }
)

export interface ProcessFileRequest {
  files: File[]
  projectId: string
  customPrompts?: {
    need?: string
    projectPlan?: string
    budgetNarrative?: string
    outcomes?: string
  }
}

export interface ProcessFileResponse {
  jobId: string
  status: 'queued' | 'processing' | 'completed' | 'failed'
  progress: {
    stage: string
    percentage: number
  }
  result?: GrantData
  error?: string
}

export interface RegenerateRequest {
  projectId: string
  section: 'projectPlan' | 'need' | 'budgetNarrative' | 'outcomes'
  customPrompt?: string
}

class ApiService {
  async getProjects(): Promise<Project[]> {
    const response = await apiClient.get('/projects')
    return response.data
  }

  async getProject(id: string): Promise<Project> {
    const response = await apiClient.get(`/projects/${id}`)
    return response.data
  }

  async createProject(data: { name: string; description: string }): Promise<Project> {
    const response = await apiClient.post('/projects', data)
    return response.data
  }

  async updateProject(id: string, updates: Partial<Project>): Promise<Project> {
    const response = await apiClient.patch(`/projects/${id}`, updates)
    return response.data
  }

  async deleteProject(id: string): Promise<void> {
    await apiClient.delete(`/projects/${id}`)
  }

  async uploadFiles(request: ProcessFileRequest): Promise<ProcessFileResponse> {
    const formData = new FormData()
    request.files.forEach((file, index) => {
      formData.append(`files`, file)
    })
    formData.append('projectId', request.projectId)
    
    if (request.customPrompts) {
      formData.append('customPrompts', JSON.stringify(request.customPrompts))
    }

    const response = await apiClient.post('/process', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
      timeout: 60000,
    })
    return response.data
  }

  async getJobStatus(jobId: string): Promise<ProcessFileResponse> {
    const response = await apiClient.get(`/jobs/${jobId}`)
    return response.data
  }

  async regenerateSection(request: RegenerateRequest): Promise<{ jobId: string }> {
    const response = await apiClient.post('/regenerate', request)
    return response.data
  }

  async downloadProject(projectId: string, format: 'docx' | 'pdf'): Promise<Blob> {
    const response = await apiClient.get(`/projects/${projectId}/download`, {
      params: { format },
      responseType: 'blob',
    })
    return response.data
  }

  async inviteCollaborator(projectId: string, email: string, role: 'editor' | 'viewer'): Promise<void> {
    await apiClient.post(`/projects/${projectId}/collaborators`, { email, role })
  }

  async removeCollaborator(projectId: string, userId: string): Promise<void> {
    await apiClient.delete(`/projects/${projectId}/collaborators/${userId}`)
  }

  async updateCollaboratorRole(projectId: string, userId: string, role: 'editor' | 'viewer'): Promise<void> {
    await apiClient.patch(`/projects/${projectId}/collaborators/${userId}`, { role })
  }

  async getRegenerationQuota(): Promise<{ used: number; limit: number; resetDate: string }> {
    const response = await apiClient.get('/quota/regenerations')
    return response.data
  }

  async getActiveJobs(): Promise<Array<{ id: string; status: string; progress: number }>> {
    const response = await apiClient.get('/jobs/active')
    return response.data
  }
}

export const apiService = new ApiService()