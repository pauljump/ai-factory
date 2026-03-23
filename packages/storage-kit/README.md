# @pauljump/storage-kit

File/image uploads via Google Cloud Storage. Uses Application Default Credentials on Cloud Run (no key needed).

## Usage

```typescript
import { createStorage } from '@pauljump/storage-kit'

const storage = createStorage({ bucket: 'my-app-uploads' })

// Upload
const result = await storage.upload({
  data: buffer,
  filename: 'photos/profile-123.jpg',
  contentType: 'image/jpeg',
})

// Signed URL (temporary access to private files)
const url = await storage.getSignedUrl({
  filename: 'photos/profile-123.jpg',
  expiresIn: 3600,
})

// Delete
await storage.delete('photos/profile-123.jpg')

// Check existence
const exists = await storage.exists('photos/profile-123.jpg')
```

## With Fastify Multipart

```typescript
import multipart from '@fastify/multipart'

await app.register(multipart)

app.post('/api/upload', async (request) => {
  const file = await request.file()
  return storage.upload({
    data: file.file,
    filename: `uploads/${Date.now()}-${file.filename}`,
    contentType: file.mimetype,
  })
})
```

## Auth

- **Cloud Run:** Uses Application Default Credentials automatically
- **Local dev:** Set `GOOGLE_APPLICATION_CREDENTIALS` env var pointing to a service account key
