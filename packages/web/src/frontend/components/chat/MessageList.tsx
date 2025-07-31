import React from 'react'
import { FileText, User, Bot, AlertTriangle } from 'lucide-react'

interface Message {
  id: string
  type: 'user' | 'assistant' | 'system'
  content: string
  timestamp: Date
  files?: File[]
  jobId?: string
}

interface MessageListProps {
  messages: Message[]
}

export default function MessageList({ messages }: MessageListProps) {
  const formatTime = (date: Date) => {
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
  }

  const getMessageIcon = (type: string) => {
    switch (type) {
      case 'user':
        return <User className="h-4 w-4" />
      case 'assistant':
        return <Bot className="h-4 w-4" />
      case 'system':
        return <AlertTriangle className="h-4 w-4" />
      default:
        return null
    }
  }

  return (
    <div className="space-y-4">
      {messages.map((message) => (
        <div key={`${message.id}-${message.timestamp.getTime()}`} className={`chat-message ${message.type}`}>
          <div className="flex items-start space-x-3">
            <div className={`flex-shrink-0 p-2 rounded-full ${
              message.type === 'user'
                ? 'bg-blue-100 text-blue-600'
                : message.type === 'assistant'
                ? 'bg-gray-100 text-gray-600'
                : 'bg-yellow-100 text-yellow-600'
            }`}>
              {getMessageIcon(message.type)}
            </div>
            
            <div className="flex-1 min-w-0">
              <div className="flex items-center space-x-2 mb-1">
                <span className="text-sm font-medium text-gray-900">
                  {message.type === 'user' ? 'You' : message.type === 'assistant' ? 'Assistant' : 'System'}
                </span>
                <span className="text-xs text-gray-500">{formatTime(message.timestamp)}</span>
              </div>
              
              <div className="text-sm text-gray-700 whitespace-pre-wrap">
                {message.content}
              </div>

              {message.files && message.files.length > 0 && (
                <div className="mt-2 space-y-1">
                  {message.files.map((file, index) => (
                    <div key={index} className="flex items-center space-x-2 text-xs text-gray-500">
                      <FileText className="h-3 w-3" />
                      <span>{file.name} ({(file.size / 1024 / 1024).toFixed(1)} MB)</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}