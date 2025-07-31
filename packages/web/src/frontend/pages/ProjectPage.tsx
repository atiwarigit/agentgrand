import React, { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { useProject } from '../contexts/ProjectContext'
import { apiService } from '../services/apiService'
import ChatInterface from '../components/chat/ChatInterface'
import DraftEditor from '../components/draft/DraftEditor'
import CompliancePanel from '../components/compliance/CompliancePanel'
import { FileText, MessageSquare, CheckSquare, Download, Users, Settings } from 'lucide-react'

type TabType = 'chat' | 'draft' | 'compliance' | 'collaborators'

export default function ProjectPage() {
  const { id } = useParams<{ id: string }>()
  const { currentProject, setCurrentProject } = useProject()
  const [activeTab, setActiveTab] = useState<TabType>('chat')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (id) {
      loadProject(id)
    }
  }, [id])

  const loadProject = async (projectId: string) => {
    try {
      setLoading(true)
      const project = await apiService.getProject(projectId)
      setCurrentProject(project)
    } catch (error) {
      console.error('Error loading project:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleDownload = async (format: 'docx' | 'pdf') => {
    if (!currentProject) return
    
    try {
      const blob = await apiService.downloadProject(currentProject.id, format)
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.style.display = 'none'
      a.href = url
      a.download = `${currentProject.name}.${format}`
      document.body.appendChild(a)
      a.click()
      window.URL.revokeObjectURL(url)
      document.body.removeChild(a)
    } catch (error) {
      console.error('Error downloading project:', error)
    }
  }

  const tabs = [
    { id: 'chat' as TabType, name: 'Chat & Upload', icon: MessageSquare },
    { id: 'draft' as TabType, name: 'Draft Editor', icon: FileText },
    { id: 'compliance' as TabType, name: 'Compliance', icon: CheckSquare },
    { id: 'collaborators' as TabType, name: 'Collaborators', icon: Users },
  ]

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
          <p className="mt-4 text-lg text-gray-600">Loading project...</p>
        </div>
      </div>
    )
  }

  if (!currentProject) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-900">Project not found</h2>
          <p className="mt-2 text-gray-600">The project you're looking for doesn't exist or you don't have access to it.</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-4">
              <h1 className="text-xl font-semibold text-gray-900">
                {currentProject.name}
              </h1>
              <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                currentProject.status === 'completed' 
                  ? 'bg-green-100 text-green-800'
                  : currentProject.status === 'in_progress'
                  ? 'bg-blue-100 text-blue-800'
                  : 'bg-gray-100 text-gray-800'
              }`}>
                {currentProject.status.replace('_', ' ')}
              </span>
            </div>
            
            <div className="flex items-center space-x-2">
              <div className="text-sm text-gray-600">
                {currentProject.regenerationsUsed}/{currentProject.maxRegenerations} regenerations used
              </div>
              
              <div className="border-l border-gray-300 pl-4 flex space-x-2">
                <button
                  onClick={() => handleDownload('docx')}
                  className="inline-flex items-center px-3 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
                >
                  <Download className="h-4 w-4 mr-2" />
                  DOCX
                </button>
                
                <button
                  onClick={() => handleDownload('pdf')}
                  className="inline-flex items-center px-3 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
                >
                  <Download className="h-4 w-4 mr-2" />
                  PDF
                </button>
                
                <button className="inline-flex items-center px-3 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50">
                  <Settings className="h-4 w-4" />
                </button>
              </div>
            </div>
          </div>

          {/* Tab Navigation */}
          <div className="border-t">
            <nav className="-mb-px flex space-x-8">
              {tabs.map((tab) => {
                const Icon = tab.icon
                const isActive = activeTab === tab.id
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`py-2 px-1 border-b-2 font-medium text-sm whitespace-nowrap flex items-center space-x-2 ${
                      isActive
                        ? 'border-blue-500 text-blue-600'
                        : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                    }`}
                  >
                    <Icon className="h-4 w-4" />
                    <span>{tab.name}</span>
                  </button>
                )
              })}
            </nav>
          </div>
        </div>
      </header>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="h-[calc(100vh-200px)]">
          {activeTab === 'chat' && (
            <ChatInterface projectId={currentProject.id} />
          )}
          
          {activeTab === 'draft' && (
            <DraftEditor project={currentProject} />
          )}
          
          {activeTab === 'compliance' && (
            <CompliancePanel project={currentProject} />
          )}
          
          {activeTab === 'collaborators' && (
            <div className="bg-white rounded-lg shadow h-full p-6">
              <h3 className="text-lg font-medium text-gray-900 mb-4">
                Project Collaborators
              </h3>
              
              <div className="space-y-4">
                {currentProject.collaborators.map((collaborator) => (
                  <div key={collaborator.id} className="flex items-center justify-between p-4 border border-gray-200 rounded-lg">
                    <div className="flex items-center space-x-3">
                      <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                        <span className="text-sm font-medium text-blue-600">
                          {collaborator.name.charAt(0).toUpperCase()}
                        </span>
                      </div>
                      <div>
                        <p className="text-sm font-medium text-gray-900">{collaborator.name}</p>
                        <p className="text-sm text-gray-500">{collaborator.email}</p>
                      </div>
                    </div>
                    
                    <div className="flex items-center space-x-2">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        collaborator.role === 'owner'
                          ? 'bg-purple-100 text-purple-800'
                          : collaborator.role === 'editor'
                          ? 'bg-blue-100 text-blue-800'
                          : 'bg-gray-100 text-gray-800'
                      }`}>
                        {collaborator.role}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
              
              <div className="mt-6">
                <button className="inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50">
                  <Users className="h-4 w-4 mr-2" />
                  Invite Collaborator
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}