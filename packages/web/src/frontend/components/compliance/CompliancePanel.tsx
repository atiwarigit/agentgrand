import React, { useState } from 'react'
import { CheckCircle, XCircle, AlertTriangle, Clock, FileText, Users } from 'lucide-react'
import { Project } from '../../contexts/ProjectContext'

interface CompliancePanelProps {
  project: Project
}

export default function CompliancePanel({ project }: CompliancePanelProps) {
  const [overrides, setOverrides] = useState<Record<string, { enabled: boolean; reason: string }>>({})

  const compliance = project.grantData?.compliance || {
    pageLimit: { current: 0, max: 50 },
    wordLimit: { current: 0, max: 5000 },
    requiredAttachments: [],
    deadlineAlerts: []
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'met':
        return <CheckCircle className="h-5 w-5 text-green-500" />
      case 'not_met':
        return <XCircle className="h-5 w-5 text-red-500" />
      case 'overridden':
        return <AlertTriangle className="h-5 w-5 text-yellow-500" />
      default:
        return <Clock className="h-5 w-5 text-gray-400" />
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'met':
        return 'text-green-700 bg-green-50 border-green-200'
      case 'not_met':
        return 'text-red-700 bg-red-50 border-red-200'
      case 'overridden':
        return 'text-yellow-700 bg-yellow-50 border-yellow-200'
      default:
        return 'text-gray-700 bg-gray-50 border-gray-200'
    }
  }

  const handleOverride = (itemKey: string, reason: string) => {
    setOverrides(prev => ({
      ...prev,
      [itemKey]: { enabled: true, reason }
    }))
  }

  const calculateOverallCompliance = () => {
    let total = 0
    let met = 0

    // Check word limit
    total++
    if (compliance.wordLimit.current <= compliance.wordLimit.max) met++

    // Check page limit
    total++
    if (compliance.pageLimit.current <= compliance.pageLimit.max) met++

    // Check required attachments
    compliance.requiredAttachments.forEach(attachment => {
      if (attachment.required) {
        total++
        if (attachment.uploaded || overrides[`attachment-${attachment.name}`]?.enabled) met++
      }
    })

    return { met, total, percentage: total > 0 ? Math.round((met / total) * 100) : 100 }
  }

  const overallCompliance = calculateOverallCompliance()

  return (
    <div className="bg-white rounded-lg shadow h-full flex flex-col">
      {/* Header */}
      <div className="px-6 py-4 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-medium text-gray-900">Compliance Checklist</h2>
          <div className="flex items-center space-x-2">
            <div className={`px-3 py-1 rounded-full text-sm font-medium ${
              overallCompliance.percentage >= 90 
                ? 'bg-green-100 text-green-800'
                : overallCompliance.percentage >= 70
                ? 'bg-yellow-100 text-yellow-800'
                : 'bg-red-100 text-red-800'
            }`}>
              {overallCompliance.met}/{overallCompliance.total} checks passed
            </div>
          </div>
        </div>
        
        {/* Progress Bar */}
        <div className="mt-3">
          <div className="flex items-center justify-between text-sm text-gray-600 mb-1">
            <span>Overall Compliance</span>
            <span>{overallCompliance.percentage}%</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div
              className={`h-2 rounded-full transition-all duration-300 ${
                overallCompliance.percentage >= 90 
                  ? 'bg-green-500'
                  : overallCompliance.percentage >= 70
                  ? 'bg-yellow-500'
                  : 'bg-red-500'
              }`}
              style={{ width: `${overallCompliance.percentage}%` }}
            />
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-6 space-y-6">
        {/* Document Limits */}
        <div className="space-y-4">
          <h3 className="text-sm font-medium text-gray-900 flex items-center">
            <FileText className="h-4 w-4 mr-2" />
            Document Limits
          </h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Word Limit */}
            <div className={`border rounded-lg p-4 ${getStatusColor(
              compliance.wordLimit.current <= compliance.wordLimit.max ? 'met' : 'not_met'
            )}`}>
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium">Word Count</span>
                {getStatusIcon(compliance.wordLimit.current <= compliance.wordLimit.max ? 'met' : 'not_met')}
              </div>
              <div className="text-lg font-semibold">
                {compliance.wordLimit.current.toLocaleString()} / {compliance.wordLimit.max.toLocaleString()}
              </div>
              <div className="w-full bg-white bg-opacity-50 rounded-full h-2 mt-2">
                <div
                  className="h-2 rounded-full bg-current opacity-75"
                  style={{ 
                    width: `${Math.min((compliance.wordLimit.current / compliance.wordLimit.max) * 100, 100)}%` 
                  }}
                />
              </div>
            </div>

            {/* Page Limit */}
            <div className={`border rounded-lg p-4 ${getStatusColor(
              compliance.pageLimit.current <= compliance.pageLimit.max ? 'met' : 'not_met'
            )}`}>
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium">Page Count</span>
                {getStatusIcon(compliance.pageLimit.current <= compliance.pageLimit.max ? 'met' : 'not_met')}
              </div>
              <div className="text-lg font-semibold">
                {compliance.pageLimit.current} / {compliance.pageLimit.max}
              </div>
              <div className="w-full bg-white bg-opacity-50 rounded-full h-2 mt-2">
                <div
                  className="h-2 rounded-full bg-current opacity-75"
                  style={{ 
                    width: `${Math.min((compliance.pageLimit.current / compliance.pageLimit.max) * 100, 100)}%` 
                  }}
                />
              </div>
            </div>
          </div>
        </div>

        {/* Required Attachments */}
        <div className="space-y-4">
          <h3 className="text-sm font-medium text-gray-900 flex items-center">
            <Users className="h-4 w-4 mr-2" />
            Required Attachments
          </h3>
          
          <div className="space-y-3">
            {compliance.requiredAttachments.map((attachment, index) => {
              const isOverridden = overrides[`attachment-${attachment.name}`]?.enabled
              const status = attachment.uploaded ? 'met' : isOverridden ? 'overridden' : 'not_met'
              
              return (
                <div key={index} className={`border rounded-lg p-4 ${getStatusColor(status)}`}>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      {getStatusIcon(status)}
                      <div>
                        <span className="text-sm font-medium">{attachment.name}</span>
                        {attachment.required && (
                          <span className="ml-2 text-xs text-red-600">Required</span>
                        )}
                        {attachment.filename && (
                          <p className="text-xs text-gray-500 mt-1">
                            Uploaded: {attachment.filename}
                          </p>
                        )}
                        {isOverridden && (
                          <p className="text-xs text-yellow-700 mt-1">
                            Override: {overrides[`attachment-${attachment.name}`].reason}
                          </p>
                        )}
                      </div>
                    </div>
                    
                    <div className="flex space-x-2">
                      {!attachment.uploaded && (
                        <button className="text-xs text-blue-600 hover:text-blue-800 font-medium">
                          Upload
                        </button>
                      )}
                      {!attachment.uploaded && !isOverridden && (
                        <button 
                          onClick={() => {
                            const reason = prompt('Please provide a reason for overriding this requirement:')
                            if (reason) {
                              handleOverride(`attachment-${attachment.name}`, reason)
                            }
                          }}
                          className="text-xs text-yellow-600 hover:text-yellow-800 font-medium"
                        >
                          Override
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        {/* Deadline Alerts */}
        {compliance.deadlineAlerts && compliance.deadlineAlerts.length > 0 && (
          <div className="space-y-4">
            <h3 className="text-sm font-medium text-gray-900 flex items-center">
              <Clock className="h-4 w-4 mr-2" />
              Deadline Alerts
            </h3>
            
            <div className="space-y-3">
              {compliance.deadlineAlerts.map((alert, index) => (
                <div key={index} className={`border rounded-lg p-4 ${
                  alert.severity === 'error' 
                    ? 'border-red-200 bg-red-50 text-red-700'
                    : alert.severity === 'warning'
                    ? 'border-yellow-200 bg-yellow-50 text-yellow-700'
                    : 'border-blue-200 bg-blue-50 text-blue-700'
                }`}>
                  <div className="flex items-start space-x-3">
                    {alert.severity === 'error' ? (
                      <XCircle className="h-5 w-5 text-red-500 flex-shrink-0 mt-0.5" />
                    ) : alert.severity === 'warning' ? (
                      <AlertTriangle className="h-5 w-5 text-yellow-500 flex-shrink-0 mt-0.5" />
                    ) : (
                      <Clock className="h-5 w-5 text-blue-500 flex-shrink-0 mt-0.5" />
                    )}
                    <div>
                      <p className="text-sm font-medium">{alert.message}</p>
                      <p className="text-xs opacity-75 mt-1">
                        {new Date(alert.date).toLocaleString()}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Actions */}
      <div className="px-6 py-4 border-t border-gray-200">
        <div className="flex justify-between items-center">
          <button className="text-sm text-gray-600 hover:text-gray-800">
            Export Compliance Report
          </button>
          
          <div className="flex space-x-2">
            <button className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50">
              Refresh Checks
            </button>
            <button 
              className="px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700"
              disabled={overallCompliance.percentage < 100}
            >
              Mark Ready for Submission
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}