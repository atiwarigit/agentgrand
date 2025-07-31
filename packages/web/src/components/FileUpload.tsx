// @ts-ignore
import React, { useCallback, useState } from 'react';
import { extractTextFromFile, formatFileSize } from '../utils/fileProcessor.js';

interface FileUploadProps {
  onFileProcessed: (file: File, content: string) => void;
  disabled?: boolean;
  acceptedTypes?: string[];
}

export function FileUpload({ 
  onFileProcessed, 
  disabled = false,
  acceptedTypes = ['.pdf', '.docx', '.doc', '.txt']
}: FileUploadProps) {
  const [isDragOver, setIsDragOver] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [error, setError] = useState<string | null>(null);

  const processFile = useCallback(async (file: File) => {
    setIsProcessing(true);
    setError(null);
    
    try {
      const content = await extractTextFromFile(file);
      setUploadedFile(file);
      onFileProcessed(file, content);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Error processing file';
      setError(errorMessage);
    } finally {
      setIsProcessing(false);
    }
  }, [onFileProcessed]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    
    if (disabled) return;
    
    const files = Array.from(e.dataTransfer.files);
    if (files.length > 0) {
      processFile(files[0]);
    }
  }, [processFile, disabled]);

  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      processFile(files[0]);
    }
  }, [processFile]);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    if (!disabled) {
      setIsDragOver(true);
    }
  }, [disabled]);

  const handleDragLeave = useCallback(() => {
    setIsDragOver(false);
  }, []);

  return (
    <div className="space-y-3">
      <div
        className={`
          border-2 border-dashed rounded-lg p-6 text-center transition-colors
          ${isDragOver ? 'border-primary-500 bg-primary-50' : 'border-gray-300'}
          ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer hover:border-primary-400'}
        `}
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
      >
        <input
          type="file"
          accept={acceptedTypes.join(',')}
          onChange={handleFileSelect}
          disabled={disabled}
          className="hidden"
          id="file-upload"
        />
        <label htmlFor="file-upload" className="cursor-pointer">
          <div className="text-4xl mb-2">📄</div>
          <div className="text-lg font-medium text-gray-700 mb-1">
            {isProcessing ? 'Processing...' : 'Upload RFP Document'}
          </div>
          <div className="text-sm text-gray-500">
            Drag and drop or click to select
          </div>
          <div className="text-xs text-gray-400 mt-1">
            Supports: {acceptedTypes.join(', ')}
          </div>
        </label>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-3">
          <div className="text-red-800 text-sm">{error}</div>
        </div>
      )}

      {uploadedFile && !error && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-3">
          <div className="flex items-center space-x-2">
            <span className="text-green-600">✓</span>
            <div className="flex-1">
              <div className="text-sm font-medium text-green-800">
                {uploadedFile.name}
              </div>
              <div className="text-xs text-green-600">
                {formatFileSize(uploadedFile.size)} - File processed successfully
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}