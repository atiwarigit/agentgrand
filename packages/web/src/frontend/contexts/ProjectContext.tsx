import React, { createContext, useContext, useState, useEffect } from 'react'
import { apiService } from '../services/apiService'

export interface Project {
  id: string
  name: string
  description: string
  status: 'draft' | 'in_progress' | 'completed' | 'submitted'
  createdAt: string
  updatedAt: string
  owner: {
    id: string
    name: string
    email: string
  }
  collaborators: Array<{
    id: string
    name: string
    email: string
    role: 'owner' | 'editor' | 'viewer'
  }>
  regenerationsUsed: number
  maxRegenerations: number
  grantData?: GrantData
}

export interface GrantData {
  summary: string
  deadlines: Array<{
    task: string
    date: string
    completed: boolean
  }>
  eligibility: Array<{
    requirement: string
    status: 'met' | 'not_met' | 'pending'
    notes?: string
  }>
  sections: {
    need: string
    projectPlan: string
    budgetNarrative: string
    outcomes: string
  }
  compliance: {
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
  kpiSuggestions: Array<{
    category: string
    metric: string
    target: string
    measurement: string
  }>
}

interface ProjectContextType {
  projects: Project[]
  currentProject: Project | null
  loading: boolean
  createProject: (name: string, description: string) => Promise<Project>
  updateProject: (id: string, updates: Partial<Project>) => Promise<void>
  deleteProject: (id: string) => Promise<void>
  setCurrentProject: (project: Project | null) => void
  refreshProjects: () => Promise<void>
}

const ProjectContext = createContext<ProjectContextType | undefined>(undefined)

export function ProjectProvider({ children }: { children: React.ReactNode }) {
  const [projects, setProjects] = useState<Project[]>([])
  const [currentProject, setCurrentProject] = useState<Project | null>(null)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    refreshProjects()
  }, [])

  const refreshProjects = async () => {
    setLoading(true)
    try {
      const data = await apiService.getProjects()
      setProjects(data)
    } catch (error) {
      console.error('Error fetching projects:', error)
    } finally {
      setLoading(false)
    }
  }

  const createProject = async (name: string, description: string): Promise<Project> => {
    const project = await apiService.createProject({ name, description })
    setProjects(prev => [project, ...prev])
    return project
  }

  const updateProject = async (id: string, updates: Partial<Project>) => {
    const updatedProject = await apiService.updateProject(id, updates)
    setProjects(prev => prev.map(p => p.id === id ? updatedProject : p))
    if (currentProject?.id === id) {
      setCurrentProject(updatedProject)
    }
  }

  const deleteProject = async (id: string) => {
    await apiService.deleteProject(id)
    setProjects(prev => prev.filter(p => p.id !== id))
    if (currentProject?.id === id) {
      setCurrentProject(null)
    }
  }

  const value = {
    projects,
    currentProject,
    loading,
    createProject,
    updateProject,
    deleteProject,
    setCurrentProject,
    refreshProjects,
  }

  return <ProjectContext.Provider value={value}>{children}</ProjectContext.Provider>
}

export function useProject() {
  const context = useContext(ProjectContext)
  if (context === undefined) {
    throw new Error('useProject must be used within a ProjectProvider')
  }
  return context
}