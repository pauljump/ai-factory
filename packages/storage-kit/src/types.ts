import type { Readable } from 'stream'

export interface StorageConfig {
  bucket: string
  projectId?: string
  keyFilename?: string
}

export interface UploadOptions {
  data: Buffer | Readable
  filename: string
  contentType?: string
  public?: boolean
  metadata?: Record<string, string>
}

export interface UploadResult {
  filename: string
  url: string
  bucket: string
}

export interface SignedUrlOptions {
  filename: string
  expiresIn?: number
  action?: 'read' | 'write'
}

export interface StorageClient {
  upload(options: UploadOptions): Promise<UploadResult>
  getSignedUrl(options: SignedUrlOptions): Promise<string>
  delete(filename: string): Promise<void>
  exists(filename: string): Promise<boolean>
}
