import type { ZodType } from "zod";

/** Configuration shared by all document-kit functions. */
export interface DocumentConfig {
  /** Anthropic API key. */
  apiKey: string;
  /** Model to use for vision requests. Defaults to "claude-sonnet-4-20250514". */
  model?: string;
  /** Maximum tokens for the response. Defaults to 4096. */
  maxTokens?: number;
}

/** Result from a plain-text OCR extraction. */
export interface OCRResult {
  /** The extracted text content. */
  text: string;
  /** Model used for extraction. */
  model: string;
  /** Token usage from the API call. */
  usage: {
    inputTokens: number;
    outputTokens: number;
  };
}

/** Options for extractText(). */
export interface ExtractTextOptions extends DocumentConfig {
  /** Image data — a Buffer or a base64-encoded string. */
  image: Buffer | string;
  /** Optional media type hint. Defaults to "image/png". */
  mediaType?: "image/png" | "image/jpeg" | "image/gif" | "image/webp";
  /** Optional prompt to guide the OCR. */
  prompt?: string;
}

/** Options for extractStructured(). */
export interface ExtractStructuredOptions<T> extends DocumentConfig {
  /** Image data — a Buffer or a base64-encoded string. */
  image: Buffer | string;
  /** Optional media type hint. Defaults to "image/png". */
  mediaType?: "image/png" | "image/jpeg" | "image/gif" | "image/webp";
  /** Zod schema describing the expected output shape. */
  schema: ZodType<T>;
  /** Prompt describing what to extract from the document. */
  prompt: string;
}

/** Result from a structured extraction. */
export interface ExtractedData<T> {
  /** The extracted and validated data. */
  data: T;
  /** Model used for extraction. */
  model: string;
  /** Token usage from the API call. */
  usage: {
    inputTokens: number;
    outputTokens: number;
  };
}
