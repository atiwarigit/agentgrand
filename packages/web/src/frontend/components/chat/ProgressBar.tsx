import React from 'react'
import { CheckCircle, Clock, AlertCircle } from 'lucide-react'
import { ProcessFileResponse } from '../../services/apiService'

interface ProgressBarProps {
  job: ProcessFileResponse
}

const progressStages = [
  { key: 'uploading', label: 'Uploading & Virus Scan' },
  { key: 'parsing', label: 'Parsing & Text Extraction' },
  { key: 'embedding', label: 'Chunking & Embedding' },
  { key: 'drafting', label: 'Draft Generation' },
  { key: 'compliance', label: 'Compliance Check' },
  { key: 'packaging', label: 'Packaging Outputs' },
]

export default function ProgressBar({ job }: ProgressBarProps) {
  const getCurrentStageIndex = () => {
    const stageMap: Record<string, number> = {
      'uploading': 0,
      'parsing': 1,
      'embedding': 2,
      'drafting': 3,
      'compliance': 4,
      'packaging': 5,
    }
    return stageMap[job.progress?.stage] ?? 0
  }

  const currentStageIndex = getCurrentStageIndex()
  const isCompleted = job.status === 'completed'
  const isFailed = job.status === 'failed'

  return (
    <div className="w-full">
      <div className="flex items-center justify-between mb-2">
        <span className="text-sm font-medium text-gray-700">
          {isFailed ? 'Processing Failed' : isCompleted ? 'Processing Complete' : 'Processing...'}
        </span>
        <span className="text-sm text-gray-500">
          {job.progress?.percentage || 0}%
        </span>
      </div>

      {/* Progress Bar */}
      <div className="w-full bg-gray-200 rounded-full h-2 mb-4">
        <div
          className={`h-2 rounded-full transition-all duration-300 ${
            isFailed
              ? 'bg-red-500'
              : isCompleted
              ? 'bg-green-500'
              : 'bg-blue-500'
          }`}
          style={{ width: `${job.progress?.percentage || 0}%` }}
        />
      </div>

      {/* Stage Indicators */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-2">
        {progressStages.map((stage, index) => {
          const isActive = index === currentStageIndex && !isCompleted && !isFailed
          const isCompleted = index < currentStageIndex || job.status === 'completed'
          const isPending = index > currentStageIndex

          return (
            <div
              key={stage.key}
              className={`progress-step ${
                isActive
                  ? 'active'
                  : isCompleted
                  ? 'completed'
                  : 'pending'
              }`}
            >
              <div className="flex items-center space-x-1">
                {isFailed && index === currentStageIndex ? (
                  <AlertCircle className="h-4 w-4 text-red-500" />
                ) : isCompleted ? (
                  <CheckCircle className="h-4 w-4 text-green-500" />
                ) : isActive ? (
                  <div className="h-4 w-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
                ) : (
                  <Clock className="h-4 w-4 text-gray-400" />
                )}
                <span className="text-xs font-medium truncate">
                  {stage.label}
                </span>
              </div>
            </div>
          )
        })}
      </div>

      {isFailed && job.error && (
        <div className="mt-3 p-3 bg-red-50 border border-red-200 rounded-md">
          <div className="flex items-center">
            <AlertCircle className="h-4 w-4 text-red-500 mr-2" />
            <span className="text-sm text-red-700">Error: {job.error}</span>
          </div>
        </div>
      )}
    </div>
  )
}