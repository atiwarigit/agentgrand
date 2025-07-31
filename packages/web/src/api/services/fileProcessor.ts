import AWS from 'aws-sdk'
import { database } from '../database/connection'
import axios from 'axios'

const s3 = new AWS.S3({
  accessKeyId: process.env.AWS_ACCESS_KEY_ID,
  secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  region: process.env.AWS_REGION || 'us-east-1'
})

const AI_SERVICE_URL = process.env.AI_SERVICE_URL || 'http://localhost:8001'

export async function processFiles(
  jobId: string,
  files: Express.Multer.File[],
  projectId: string,
  userId: string
): Promise<void> {
  try {
    // Update job status
    await database.update('processing_jobs', jobId, {
      status: 'processing',
      started_at: new Date(),
      progress: { stage: 'uploading', percentage: 5 }
    })

    // Upload files to S3
    const uploadedFiles = []
    for (let i = 0; i < files.length; i++) {
      const file = files[i]
      const key = `projects/${projectId}/files/${Date.now()}-${file.originalname}`

      // Virus scan placeholder - in production, integrate with AWS GuardDuty or similar
      await virusScanPlaceholder(file.buffer)

      const uploadResult = await s3.upload({
        Bucket: process.env.S3_BUCKET || 'grant-platform-files',
        Key: key,
        Body: file.buffer,
        ContentType: file.mimetype,
        Metadata: {
          originalName: file.originalname,
          userId,
          projectId,
          jobId
        }
      }).promise()

      // Store file record
      const fileRecord = await database.insert('files', {
        project_id: projectId,
        filename: file.originalname,
        original_filename: file.originalname,
        file_type: file.mimetype,
        file_size: file.size,
        s3_bucket: uploadResult.Bucket,
        s3_key: uploadResult.Key,
        uploaded_by: userId,
        processing_status: 'processing'
      })

      uploadedFiles.push({
        id: fileRecord.id,
        s3Key: uploadResult.Key,
        originalName: file.originalname,
        contentType: file.mimetype,
        buffer: file.buffer
      })
    }

    // Update progress
    await database.update('processing_jobs', jobId, {
      progress: { stage: 'parsing', percentage: 20 }
    })

    // Send files to AI service for processing
    const formData = new FormData()
    formData.append('job_id', jobId)
    formData.append('project_id', projectId)
    formData.append('user_id', userId)

    // Add files as blobs
    uploadedFiles.forEach((file, index) => {
      const blob = new Blob([file.buffer], { type: file.contentType })
      formData.append('files', blob, file.originalName)
    })

    // Call AI service
    const aiResponse = await axios.post(`${AI_SERVICE_URL}/ingest`, formData, {
      headers: {
        'Content-Type': 'multipart/form-data'
      },
      timeout: 300000 // 5 minutes
    })

    if (aiResponse.data.status !== 'processing') {
      throw new Error('AI service did not start processing')
    }

    // Update file records as processed
    for (const file of uploadedFiles) {
      await database.update('files', file.id, {
        processing_status: 'completed',
        processed_at: new Date()
      })
    }

    console.log(`File processing initiated for job ${jobId}`)

  } catch (error) {
    console.error(`File processing failed for job ${jobId}:`, error)
    
    // Update job as failed
    await database.update('processing_jobs', jobId, {
      status: 'failed',
      error_message: error instanceof Error ? error.message : 'Unknown error',
      completed_at: new Date()
    })

    throw error
  }
}

async function virusScanPlaceholder(buffer: Buffer): Promise<void> {
  // Placeholder for virus scanning
  // In production, integrate with:
  // - AWS GuardDuty
  // - ClamAV
  // - VirusTotal API
  // - Or other enterprise security solutions

  // Basic checks for malicious file patterns
  const bufferString = buffer.toString('hex')
  
  // Check for common malware signatures (very basic)
  const suspiciousPatterns = [
    '4d5a', // PE executable header
    '504b0304', // ZIP header (could contain malicious content)
  ]

  // For now, just check file size
  if (buffer.length > 25 * 1024 * 1024) { // 25MB limit
    throw new Error('File too large for processing')
  }

  // In a real implementation, you would:
  // 1. Send file to virus scanning service
  // 2. Wait for scan results
  // 3. Reject if malware detected
  // 4. Log scan results for audit

  console.log('Virus scan completed (placeholder)')
}

export interface FileUploadResult {
  success: boolean
  files: Array<{
    id: string
    filename: string
    size: number
    status: 'uploaded' | 'failed'
    error?: string
  }>
  jobId: string
}