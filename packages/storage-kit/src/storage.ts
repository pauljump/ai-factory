import { Storage } from '@google-cloud/storage'
import type { StorageConfig, StorageClient, UploadOptions, UploadResult, SignedUrlOptions } from './types.js'

export function createStorage(config: StorageConfig): StorageClient {
  const storage = new Storage({
    projectId: config.projectId,
    keyFilename: config.keyFilename,
  })
  const bucket = storage.bucket(config.bucket)

  return {
    async upload(options: UploadOptions): Promise<UploadResult> {
      const file = bucket.file(options.filename)
      const stream = file.createWriteStream({
        contentType: options.contentType,
        metadata: options.metadata ? { metadata: options.metadata } : undefined,
        public: options.public ?? false,
      })

      await new Promise<void>((resolve, reject) => {
        stream.on('error', reject)
        stream.on('finish', resolve)

        if (Buffer.isBuffer(options.data)) {
          stream.end(options.data)
        } else {
          options.data.pipe(stream)
        }
      })

      return {
        filename: options.filename,
        url: `gs://${config.bucket}/${options.filename}`,
        bucket: config.bucket,
      }
    },

    async getSignedUrl(options: SignedUrlOptions): Promise<string> {
      const file = bucket.file(options.filename)
      const [url] = await file.getSignedUrl({
        version: 'v4',
        action: options.action ?? 'read',
        expires: Date.now() + (options.expiresIn ?? 3600) * 1000,
      })
      return url
    },

    async delete(filename: string): Promise<void> {
      await bucket.file(filename).delete({ ignoreNotFound: true })
    },

    async exists(filename: string): Promise<boolean> {
      const [exists] = await bucket.file(filename).exists()
      return exists
    },
  }
}
