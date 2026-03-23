# @pauljump/document-kit

OCR and structured document extraction powered by Claude's vision API.

## Install

```bash
pnpm add @pauljump/document-kit
```

## Usage

### Simple OCR — get text from an image

```typescript
import { extractText } from '@pauljump/document-kit'

const result = await extractText({
  apiKey: process.env.ANTHROPIC_API_KEY!,
  image: buffer,  // Buffer or base64 string
})

console.log(result.text)
```

### Structured extraction — get typed data from a document

```typescript
import { extractStructured } from '@pauljump/document-kit'
import { z } from 'zod'

const result = await extractStructured({
  apiKey: process.env.ANTHROPIC_API_KEY!,
  image: buffer,
  schema: z.object({
    vendor: z.string(),
    total: z.number(),
    date: z.string(),
    items: z.array(z.object({ name: z.string(), price: z.number() })),
  }),
  prompt: 'Extract the receipt information from this image',
})

console.log(result.data.vendor, result.data.total)
```

## API

### `extractText(options)`

Sends an image to Claude and returns all visible text.

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `apiKey` | `string` | required | Anthropic API key |
| `image` | `Buffer \| string` | required | Image data (Buffer or base64) |
| `mediaType` | `string` | `"image/png"` | MIME type of the image |
| `model` | `string` | `"claude-sonnet-4-20250514"` | Claude model to use |
| `maxTokens` | `number` | `4096` | Max response tokens |
| `prompt` | `string` | (default OCR prompt) | Custom extraction prompt |

Returns `OCRResult` with `text`, `model`, and `usage`.

### `extractStructured(options)`

Sends an image with a Zod schema and returns validated, typed data.

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `apiKey` | `string` | required | Anthropic API key |
| `image` | `Buffer \| string` | required | Image data (Buffer or base64) |
| `schema` | `ZodType<T>` | required | Zod schema for the output |
| `prompt` | `string` | required | What to extract |
| `mediaType` | `string` | `"image/png"` | MIME type of the image |
| `model` | `string` | `"claude-sonnet-4-20250514"` | Claude model to use |
| `maxTokens` | `number` | `4096` | Max response tokens |

Returns `ExtractedData<T>` with `data` (validated against schema), `model`, and `usage`.
