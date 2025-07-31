import React, { useState, useRef, useEffect } from 'react'
import { Send, Upload, FileText, AlertCircle } from 'lucide-react'
import { useProject } from '../../contexts/ProjectContext'
import { apiService, ProcessFileResponse } from '../../services/apiService'
import ProgressBar from './ProgressBar'
import MessageList from './MessageList'
import FileUploadZone from './FileUploadZone'

interface Message {
  id: string
  type: 'user' | 'assistant' | 'system'
  content: string
  timestamp: Date
  files?: File[]
  jobId?: string
}

interface ChatInterfaceProps {
  projectId: string
}

export default function ChatInterface({ projectId }: ChatInterfaceProps) {
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [isProcessing, setIsProcessing] = useState(false)
  const [currentJob, setCurrentJob] = useState<ProcessFileResponse | null>(null)
  const [selectedFiles, setSelectedFiles] = useState<File[]>([])
  const [dragActive, setDragActive] = useState(false)
  const { currentProject, updateProject } = useProject()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  useEffect(() => {
    if (currentJob && currentJob.status === 'processing') {
      const interval = setInterval(async () => {
        try {
          const updatedJob = await apiService.getJobStatus(currentJob.jobId)
          setCurrentJob(updatedJob)
          
          if (updatedJob.status === 'completed' && updatedJob.result) {
            setIsProcessing(false)
            addMessage({
              type: 'assistant',
              content: 'Analysis complete! I\'ve generated your grant proposal sections.',
            })
            
            if (currentProject) {
              await updateProject(currentProject.id, {
                grantData: updatedJob.result,
                status: 'in_progress'
              })
            }
            clearInterval(interval)
          } else if (updatedJob.status === 'failed') {
            setIsProcessing(false)
            addMessage({
              type: 'system',
              content: `Processing failed: ${updatedJob.error || 'Unknown error'}`,
            })
            clearInterval(interval)
          }
        } catch (error) {
          console.error('Error polling job status:', error)
          clearInterval(interval)
        }
      }, 2000)

      return () => clearInterval(interval)
    }
  }, [currentJob])

  const addMessage = (message: Omit<Message, 'id' | 'timestamp'>) => {
    const newMessage: Message = {
      ...message,
      id: Math.random().toString(36).substr(2, 9),
      timestamp: new Date(),
    }
    setMessages(prev => [...prev, newMessage])
  }

  const handleFileUpload = async (files: File[]) => {
    if (files.length === 0) return

    setSelectedFiles(files)
    setIsProcessing(true)

    addMessage({
      type: 'user',
      content: `Uploading ${files.length} file(s) for analysis...`,
      files,
    })

    try {
      const response = await apiService.uploadFiles({
        files,
        projectId,
      })

      setCurrentJob(response)
      addMessage({
        type: 'assistant',
        content: 'Files uploaded successfully! Starting analysis...',
        jobId: response.jobId,
      })
    } catch (error) {
      setIsProcessing(false)
      addMessage({
        type: 'system',
        content: `Upload failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
      })
    }
  }

  const handleSendMessage = async () => {
    if (!input.trim() && selectedFiles.length === 0) return

    if (selectedFiles.length > 0) {
      await handleFileUpload(selectedFiles)
      setSelectedFiles([])
    } else {
      addMessage({
        type: 'user',
        content: input,
      })

      addMessage({
        type: 'assistant',
        content: 'I understand your request. Please upload your grant documents to get started with analysis and drafting.',
      })
    }

    setInput('')
  }

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true)
    } else if (e.type === 'dragleave') {
      setDragActive(false)
    }
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setDragActive(false)

    const files = Array.from(e.dataTransfer.files)
    const validFiles = files.filter(file => {
      const validTypes = ['application/pdf', 'text/csv', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet']
      const maxSize = 20 * 1024 * 1024 // 20MB
      return validTypes.includes(file.type) && file.size <= maxSize
    })

    if (validFiles.length > 0) {
      setSelectedFiles(prev => [...prev, ...validFiles])
    }
  }

  return (
    <div className="flex flex-col h-full bg-white rounded-lg shadow-sm">
      {/* Header */}
      <div className="border-b border-gray-200 p-4">
        <h2 className="text-lg font-semibold text-gray-900">Grant Writing Assistant</h2>
        <p className="text-sm text-gray-500">Upload your documents and I'll help you create a comprehensive grant proposal</p>
      </div>

      {/* Progress Bar */}
      {isProcessing && currentJob && (
        <div className="border-b border-gray-200 p-4">
          <ProgressBar job={currentJob} />
        </div>
      )}

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.length === 0 ? (
          <div className="text-center py-8">
            <FileText className="mx-auto h-12 w-12 text-gray-400 mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">Ready to start writing your grant proposal?</h3>
            <p className="text-gray-500 mb-4">Upload your grant requirements, organizational documents, and any relevant materials to get started.</p>
            <div className="text-sm text-gray-400">
              <p>Supported formats: PDF, CSV, XLSX (up to 20MB per file)</p>
            </div>
          </div>
        ) : (
          <MessageList messages={messages} />
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* File Upload Zone */}
      {!isProcessing && (
        <FileUploadZone
          selectedFiles={selectedFiles}
          onFilesSelected={setSelectedFiles}
          dragActive={dragActive}
          onDrag={handleDrag}
          onDrop={handleDrop}
        />
      )}

      {/* Input Area */}
      <div className="border-t border-gray-200 p-4">
        <div className="flex items-center space-x-2">
          <input
            type="file"
            ref={fileInputRef}
            className="hidden"
            multiple
            accept=".pdf,.csv,.xlsx"
            onChange={(e) => {
              const files = Array.from(e.target.files || [])
              setSelectedFiles(prev => [...prev, ...files])
            }}
          />
          
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={isProcessing}
            className="p-2 text-gray-500 hover:text-gray-700 disabled:opacity-50"
          >
            <Upload className="h-5 w-5" />
          </button>

          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
            placeholder="Ask a question or upload files to get started..."
            disabled={isProcessing}
            className="flex-1 border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:opacity-50"
          />

          <button
            onClick={handleSendMessage}
            disabled={isProcessing || (!input.trim() && selectedFiles.length === 0)}
            className="bg-blue-600 text-white p-2 rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Send className="h-5 w-5" />
          </button>
        </div>

        {selectedFiles.length > 0 && (
          <div className="mt-2 flex flex-wrap gap-2">
            {selectedFiles.map((file, index) => (
              <div key={index} className="bg-blue-50 border border-blue-200 rounded px-2 py-1 text-sm">
                <span className="text-blue-700">{file.name}</span>
                <button
                  onClick={() => setSelectedFiles(prev => prev.filter((_, i) => i !== index))}
                  className="ml-2 text-blue-500 hover:text-blue-700"
                >
                  ×
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}