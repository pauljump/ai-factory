import Anthropic from "@anthropic-ai/sdk";
import type { ExtractTextOptions, OCRResult } from "./types.js";

const DEFAULT_MODEL = "claude-sonnet-4-20250514";
const DEFAULT_MAX_TOKENS = 4096;

/**
 * Extract plain text from an image using Claude's vision API.
 *
 * Sends the image to Claude and asks it to transcribe all visible text.
 */
export async function extractText(
  options: ExtractTextOptions,
): Promise<OCRResult> {
  const {
    apiKey,
    image,
    mediaType = "image/png",
    model = DEFAULT_MODEL,
    maxTokens = DEFAULT_MAX_TOKENS,
    prompt = "Extract all text from this image. Return only the text content, preserving the original structure and formatting as closely as possible. Do not add commentary.",
  } = options;

  const client = new Anthropic({ apiKey });

  const imageData =
    typeof image === "string" ? image : image.toString("base64");

  const response = await client.messages.create({
    model,
    max_tokens: maxTokens,
    messages: [
      {
        role: "user",
        content: [
          {
            type: "image",
            source: {
              type: "base64",
              media_type: mediaType,
              data: imageData,
            },
          },
          {
            type: "text",
            text: prompt,
          },
        ],
      },
    ],
  });

  const textBlock = response.content.find((block) => block.type === "text");
  const text = textBlock && "text" in textBlock ? textBlock.text : "";

  return {
    text,
    model: response.model,
    usage: {
      inputTokens: response.usage.input_tokens,
      outputTokens: response.usage.output_tokens,
    },
  };
}
