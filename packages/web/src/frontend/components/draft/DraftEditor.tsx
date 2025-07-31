import React, { useState } from 'react'
import { RefreshCw, Save, Eye, Edit3, Clock } from 'lucide-react'
import { Project } from '../../contexts/ProjectContext'
import { apiService } from '../../services/apiService'
import { useAuth } from '../../contexts/AuthContext'

interface DraftEditorProps {
  project: Project
}

type SectionType = 'need' | 'projectPlan' | 'budgetNarrative' | 'outcomes'

export default function DraftEditor({ project }: DraftEditorProps) {
  const [activeSection, setActiveSection] = useState<SectionType>('need')
  const [editMode, setEditMode] = useState<Record<SectionType, boolean>>({
    need: false,
    projectPlan: false,
    budgetNarrative: false,
    outcomes: false
  })
  const [sectionContent, setSectionContent] = useState<Record<SectionType, string>>({
    need: project.grantData?.sections?.need || '',
    projectPlan: project.grantData?.sections?.projectPlan || '',
    budgetNarrative: project.grantData?.sections?.budgetNarrative || '',
    outcomes: project.grantData?.sections?.outcomes || ''
  })
  const [regenerating, setRegenerating] = useState<SectionType | null>(null)
  const [customPrompt, setCustomPrompt] = useState('')
  const [showPromptInput, setShowPromptInput] = useState(false)

  const { user } = useAuth()

  const sections = [
    { key: 'need' as SectionType, title: 'Statement of Need', icon: '📋' },
    { key: 'projectPlan' as SectionType, title: 'Project Plan', icon: '📊' },
    { key: 'budgetNarrative' as SectionType, title: 'Budget Narrative', icon: '💰' },
    { key: 'outcomes' as SectionType, title: 'Expected Outcomes', icon: '🎯' }
  ]

  const handleSectionEdit = (section: SectionType) => {
    setEditMode(prev => ({
      ...prev,
      [section]: !prev[section]
    }))
  }

  const handleContentChange = (section: SectionType, content: string) => {
    setSectionContent(prev => ({
      ...prev,
      [section]: content
    }))
  }

  const handleSave = async (section: SectionType) => {
    try {
      // Save to project
      const updatedGrantData = {
        ...project.grantData,
        sections: {
          ...project.grantData?.sections,
          [section]: sectionContent[section]
        }
      }

      // This would normally call the API to update the project
      console.log('Saving section:', section, sectionContent[section])
      
      setEditMode(prev => ({
        ...prev,
        [section]: false
      }))
    } catch (error) {
      console.error('Error saving section:', error)
    }
  }

  const handleRegenerate = async (section: SectionType) => {
    if (!user) return

    try {
      setRegenerating(section)
      
      const response = await apiService.regenerateSection({
        projectId: project.id,
        section,
        customPrompt: customPrompt || undefined
      })

      // Poll for completion
      const pollForCompletion = async (jobId: string) => {
        const checkStatus = async () => {
          try {
            const jobStatus = await apiService.getJobStatus(jobId)
            
            if (jobStatus.status === 'completed' && jobStatus.result) {
              setSectionContent(prev => ({
                ...prev,
                [section]: jobStatus.result[section] || prev[section]
              }))
              setRegenerating(null)
              setCustomPrompt('')
              setShowPromptInput(false)
            } else if (jobStatus.status === 'failed') {
              console.error('Regeneration failed:', jobStatus.error)
              setRegenerating(null)
            } else {
              // Still processing, check again
              setTimeout(checkStatus, 2000)
            }
          } catch (error) {
            console.error('Error checking job status:', error)
            setRegenerating(null)
          }
        }
        
        checkStatus()
      }

      pollForCompletion(response.job_id)
    } catch (error) {
      console.error('Error regenerating section:', error)
      setRegenerating(null)
    }
  }

  const canRegenerate = () => {
    return project.regenerationsUsed < project.maxRegenerations
  }

  const getWordCount = (text: string) => {
    return text.trim().split(/\s+/).filter(word => word.length > 0).length
  }

  return (
    <div className="bg-white rounded-lg shadow h-full flex">
      {/* Sidebar */}
      <div className="w-64 border-r border-gray-200 flex flex-col">
        <div className="p-4 border-b border-gray-200">
          <h2 className="text-lg font-medium text-gray-900">Draft Sections</h2>
          <p className="text-sm text-gray-500 mt-1">
            {project.regenerationsUsed}/{project.maxRegenerations} regenerations used
          </p>
        </div>
        
        <div className="flex-1 overflow-y-auto">
          <nav className="p-2">
            {sections.map((section) => (
              <button
                key={section.key}
                onClick={() => setActiveSection(section.key)}
                className={`w-full text-left px-3 py-2 rounded-md text-sm font-medium mb-1 flex items-center space-x-3 ${
                  activeSection === section.key
                    ? 'bg-blue-100 text-blue-700'
                    : 'text-gray-700 hover:bg-gray-100'
                }`}
              >
                <span className="text-lg">{section.icon}</span>
                <div className="flex-1 min-w-0">
                  <div className="truncate">{section.title}</div>
                  <div className="text-xs text-gray-500">
                    {getWordCount(sectionContent[section.key])} words
                  </div>
                </div>
              </button>
            ))}
          </nav>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col">
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-medium text-gray-900">
                {sections.find(s => s.key === activeSection)?.title}
              </h3>
              <p className="text-sm text-gray-500">
                {getWordCount(sectionContent[activeSection])} words
              </p>
            </div>
            
            <div className="flex items-center space-x-2">
              {regenerating === activeSection ? (
                <div className="flex items-center space-x-2 text-blue-600">
                  <div className="w-4 h-4 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
                  <span className="text-sm">Regenerating...</span>
                </div>
              ) : (
                <>
                  <button
                    onClick={() => setShowPromptInput(!showPromptInput)}
                    className="px-3 py-1 text-sm text-gray-600 hover:text-gray-800"
                  >
                    Custom Prompt
                  </button>
                  
                  <button
                    onClick={() => handleRegenerate(activeSection)}
                    disabled={!canRegenerate()}
                    className="inline-flex items-center px-3 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <RefreshCw className="h-4 w-4 mr-2" />
                    Regenerate
                  </button>
                  
                  <button
                    onClick={() => handleSectionEdit(activeSection)}
                    className="inline-flex items-center px-3 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
                  >
                    {editMode[activeSection] ? (
                      <>
                        <Eye className="h-4 w-4 mr-2" />
                        Preview
                      </>
                    ) : (
                      <>
                        <Edit3 className="h-4 w-4 mr-2" />
                        Edit
                      </>
                    )}
                  </button>
                  
                  {editMode[activeSection] && (
                    <button
                      onClick={() => handleSave(activeSection)}
                      className="inline-flex items-center px-3 py-2 bg-blue-600 text-white text-sm font-medium rounded-md hover:bg-blue-700"
                    >
                      <Save className="h-4 w-4 mr-2" />
                      Save
                    </button>
                  )}
                </>
              )}
            </div>
          </div>
          
          {/* Custom Prompt Input */}
          {showPromptInput && (
            <div className="mt-4">
              <textarea
                value={customPrompt}
                onChange={(e) => setCustomPrompt(e.target.value)}
                placeholder="Enter specific instructions for regenerating this section..."
                className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                rows={2}
              />
            </div>
          )}
          
          {!canRegenerate() && (
            <div className="mt-2 text-xs text-red-600 flex items-center">
              <Clock className="h-3 w-3 mr-1" />
              Regeneration quota exceeded. Resets monthly.
            </div>
          )}
        </div>

        {/* Content */}
        <div className="flex-1 p-6">
          {editMode[activeSection] ? (
            <textarea
              value={sectionContent[activeSection]}
              onChange={(e) => handleContentChange(activeSection, e.target.value)}
              className="w-full h-full resize-none border border-gray-300 rounded-md p-4 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder={`Enter your ${sections.find(s => s.key === activeSection)?.title.toLowerCase()}...`}
            />
          ) : (
            <div className="prose max-w-none">
              {sectionContent[activeSection] ? (
                <div className="whitespace-pre-wrap text-gray-900 leading-relaxed">
                  {sectionContent[activeSection]}
                </div>
              ) : (
                <div className="text-center py-12 text-gray-500">
                  <FileText className="mx-auto h-12 w-12 text-gray-400 mb-4" />
                  <p className="text-lg font-medium">No content yet</p>
                  <p className="text-sm">
                    Upload documents and generate content, or start writing manually.
                  </p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}