import React from 'react'
import { Upload, X } from 'lucide-react'

interface FileUploadZoneProps {
  selectedFiles: File[]
  onFilesSelected: (files: File[]) => void
  dragActive: boolean
  onDrag: (e: React.DragEvent) => void
  onDrop: (e: React.DragEvent) => void
}

export default function FileUploadZone({
  selectedFiles,
  onFilesSelected,
  dragActive,
  onDrag,
  onDrop,
}: FileUploadZoneProps) {
  if (selectedFiles.length === 0) {
    return (
      <div
        className={`border-2 border-dashed rounded-lg p-6 text-center transition-colors ${
          dragActive
            ? 'border-blue-500 bg-blue-50'
            : 'border-gray-300 hover:border-gray-400'
        }`}
        onDragEnter={onDrag}
        onDragLeave={onDrag}
        onDragOver={onDrag}
        onDrop={onDrop}
      >
        <Upload className="mx-auto h-8 w-8 text-gray-400 mb-2" />
        <p className="text-sm text-gray-600 mb-1">
          Drag and drop your files here, or click to browse
        </p>
        <p className="text-xs text-gray-400">
          Supports PDF, CSV, XLSX files up to 20MB each
        </p>
      </div>
    )
  }

  return (
    <div className="border border-gray-200 rounded-lg p-4">
      <div className="flex items-center justify-between mb-3">
        <span className="text-sm font-medium text-gray-700">
          Selected Files ({selectedFiles.length})
        </span>
        <button
          onClick={() => onFilesSelected([])}
          className="text-xs text-gray-500 hover:text-gray-700"
        >
          Clear all
        </button>
      </div>
      
      <div className="space-y-2">
        {selectedFiles.map((file, index) => (
          <div key={index} className="flex items-center justify-between p-2 bg-gray-50 rounded">
            <div className="flex items-center space-x-2">
              <div className="text-xs text-gray-500">
                {file.type.includes('pdf') ? '📄' : file.type.includes('csv') ? '📊' : '📋'}
              </div>
              <div>
                <div className="text-sm font-medium text-gray-900">{file.name}</div>
                <div className="text-xs text-gray-500">
                  {(file.size / 1024 / 1024).toFixed(1)} MB
                </div>
              </div>
            </div>
            
            <button
              onClick={() => onFilesSelected(selectedFiles.filter((_, i) => i !== index))}
              className="text-gray-400 hover:text-gray-600"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        ))}
      </div>
    </div>
  )
}