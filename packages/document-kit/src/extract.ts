import Anthropic from "@anthropic-ai/sdk";
import type { ExtractStructuredOptions, ExtractedData } from "./types.js";

const DEFAULT_MODEL = "claude-sonnet-4-20250514";
const DEFAULT_MAX_TOKENS = 4096;

/**
 * Extract structured data from a document image using Claude's vision API.
 *
 * Sends the image along with a Zod schema description and prompt, then parses
 * and validates the response against the schema.
 */
export async function extractStructured<T>(
  options: ExtractStructuredOptions<T>,
): Promise<ExtractedData<T>> {
  const {
    apiKey,
    image,
    mediaType = "image/png",
    schema,
    prompt,
    model = DEFAULT_MODEL,
    maxTokens = DEFAULT_MAX_TOKENS,
  } = options;

  const client = new Anthropic({ apiKey });

  const imageData =
    typeof image === "string" ? image : image.toString("base64");

  // Build a schema description from the Zod schema for the prompt.
  // We use JSON.stringify on the schema's shape to give Claude a clear target.
  const schemaDescription = JSON.stringify(zodToJsonDescription(schema), null, 2);

  const systemPrompt = [
    "You are a document extraction assistant. Extract structured data from the provided image.",
    "Return ONLY valid JSON matching this exact schema — no markdown, no commentary, no code fences:",
    schemaDescription,
  ].join("\n\n");

  const response = await client.messages.create({
    model,
    max_tokens: maxTokens,
    system: systemPrompt,
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
  const raw = textBlock && "text" in textBlock ? textBlock.text : "{}";

  // Strip markdown code fences if Claude wraps the JSON
  const cleaned = raw
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/\s*```$/i, "")
    .trim();

  const parsed = JSON.parse(cleaned);
  const validated = schema.parse(parsed);

  return {
    data: validated,
    model: response.model,
    usage: {
      inputTokens: response.usage.input_tokens,
      outputTokens: response.usage.output_tokens,
    },
  };
}

/**
 * Convert a Zod schema into a plain JSON description object for the prompt.
 * This gives Claude a clear picture of the expected output shape.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function zodToJsonDescription(schema: any): unknown {
  // Zod schemas expose _def with typeName
  const def = schema?._def;
  if (!def) return "unknown";

  const typeName: string = def.typeName ?? "";

  switch (typeName) {
    case "ZodString":
      return { type: "string" };
    case "ZodNumber":
      return { type: "number" };
    case "ZodBoolean":
      return { type: "boolean" };
    case "ZodArray":
      return { type: "array", items: zodToJsonDescription(def.type) };
    case "ZodOptional":
      return { ...zodToJsonDescription(def.innerType) as object, optional: true };
    case "ZodNullable":
      return { ...zodToJsonDescription(def.innerType) as object, nullable: true };
    case "ZodObject": {
      const shape = def.shape?.();
      if (!shape) return { type: "object" };
      const properties: Record<string, unknown> = {};
      for (const [key, value] of Object.entries(shape)) {
        properties[key] = zodToJsonDescription(value);
      }
      return { type: "object", properties };
    }
    default:
      return { type: "unknown" };
  }
}
