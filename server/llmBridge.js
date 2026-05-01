// llmBridge.js — OpenClaw Gateway client (OpenAI-compatible endpoint)

const GATEWAY_URL =
  process.env.OPENCLAW_GATEWAY_URL || "http://localhost:18789";
const GATEWAY_TOKEN = process.env.OPENCLAW_GATEWAY_TOKEN || "";
const DEFAULT_MODEL = "claude-sonnet-4-20250514";

function buildHeaders() {
  const headers = { "Content-Type": "application/json" };
  if (GATEWAY_TOKEN) {
    headers["Authorization"] = `Bearer ${GATEWAY_TOKEN}`;
  }
  return headers;
}

function formatFileSection(title, files) {
  if (!files || Object.keys(files).length === 0) return "";
  return [
    title,
    ...Object.entries(files).map(
      ([path, content]) => `File: ${path}\n\`\`\`\n${content}\n\`\`\``
    ),
  ].join("\n\n");
}

function buildMessages({ question, repoContext, fileContents, referenceFiles }) {
  let systemText =
    "You are a helpful code assistant. You have access to the following repository.";

  if (repoContext) {
    systemText += `\n\nRepository structure:\n\`\`\`\n${repoContext}\n\`\`\``;
  }

  const editableSection = formatFileSection("Editable files:", fileContents);
  if (editableSection) {
    systemText += `\n\n${editableSection}`;
  }

  const referenceSection = formatFileSection(
    "Reference-only files (follow these guidelines unless the task explicitly requires editing them):",
    referenceFiles
  );
  if (referenceSection) {
    systemText += `\n\n${referenceSection}`;
  }

  return [
    { role: "system", content: systemText },
    { role: "user", content: question },
  ];
}

/**
 * Ask a code question and receive the full answer.
 */
export async function askCodeQuestion({
  question,
  repoContext,
  fileContents,
  referenceFiles,
  model,
}) {
  const messages = buildMessages({
    question,
    repoContext,
    fileContents,
    referenceFiles,
  });

  const res = await fetch(`${GATEWAY_URL}/v1/chat/completions`, {
    method: "POST",
    headers: buildHeaders(),
    body: JSON.stringify({
      model: model || DEFAULT_MODEL,
      messages,
      stream: false,
    }),
  });

  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(
      `Gateway request failed (${res.status}): ${body.slice(0, 500)}`
    );
  }

  const data = await res.json();
  return data.choices[0].message.content;
}

/**
 * Stream a code question, calling onChunk with each content delta.
 * Calls onChunk(null) when the stream is complete.
 * Returns the full accumulated answer.
 */
export async function streamCodeQuestion({
  question,
  repoContext,
  fileContents,
  referenceFiles,
  model,
  onChunk,
}) {
  const messages = buildMessages({
    question,
    repoContext,
    fileContents,
    referenceFiles,
  });

  const res = await fetch(`${GATEWAY_URL}/v1/chat/completions`, {
    method: "POST",
    headers: buildHeaders(),
    body: JSON.stringify({
      model: model || DEFAULT_MODEL,
      messages,
      stream: true,
    }),
  });

  if (!res.ok) {
    // Fallback: if the gateway doesn't support streaming (405), use non-streaming
    if (res.status === 405) {
      console.warn("[llmBridge] Streaming not supported (405), falling back to non-streaming");
      const answer = await askCodeQuestion({
        question,
        repoContext,
        fileContents,
        referenceFiles,
        model,
      });
      if (onChunk) {
        onChunk(answer);
        onChunk(null);
      }
      return answer;
    }
    const body = await res.text().catch(() => "");
    throw new Error(
      `Gateway stream request failed (${res.status}): ${body.slice(0, 500)}`
    );
  }

  let accumulated = "";
  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });

    const lines = buffer.split("\n");
    // Keep the last potentially incomplete line in the buffer
    buffer = lines.pop() || "";

    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith(":")) continue;

      if (!trimmed.startsWith("data: ")) continue;

      const payload = trimmed.slice(6);

      if (payload === "[DONE]") {
        if (onChunk) onChunk(null);
        return accumulated;
      }

      try {
        const parsed = JSON.parse(payload);
        const content = parsed.choices?.[0]?.delta?.content;
        if (content) {
          accumulated += content;
          if (onChunk) onChunk(content);
        }
      } catch {
        // Skip malformed JSON lines
      }
    }
  }

  // If stream ended without [DONE], still signal completion
  if (onChunk) onChunk(null);
  return accumulated;
}

/**
 * Ask a code question that must return structured JSON output.
 * Uses a strict system prompt to enforce JSON response format.
 * Falls back to parsing JSON from markdown code blocks if raw parse fails.
 */
export async function askStructuredCodeQuestion({
  question,
  repoContext,
  fileContents,
  referenceFiles,
  model,
  systemPromptExtra,
}) {
  const systemText = [
    "You are a code assistant. You MUST respond with valid JSON only — no markdown, no explanation outside the JSON.",
    systemPromptExtra || "",
    repoContext ? `\nRepository structure:\n\`\`\`\n${repoContext}\n\`\`\`` : "",
    fileContents && Object.keys(fileContents).length > 0
      ? `\n\n${formatFileSection("Editable files:", fileContents)}`
      : "",
    referenceFiles && Object.keys(referenceFiles).length > 0
      ? `\n\n${formatFileSection(
          "Reference-only files (follow these guidelines unless the task explicitly requires editing them):",
          referenceFiles
        )}`
      : "",
  ].join("");

  const messages = [
    { role: "system", content: systemText },
    { role: "user", content: question },
  ];

  const res = await fetch(`${GATEWAY_URL}/v1/chat/completions`, {
    method: "POST",
    headers: buildHeaders(),
    body: JSON.stringify({
      model: model || DEFAULT_MODEL,
      messages,
      stream: false,
    }),
  });

  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(
      `Gateway request failed (${res.status}): ${body.slice(0, 500)}`
    );
  }

  const data = await res.json();
  const raw = data.choices[0].message.content;

  // Try direct parse first
  try {
    return JSON.parse(raw);
  } catch {
    // Try extracting JSON from a markdown code block
    const match = raw.match(/```(?:json)?\s*([\s\S]*?)```/);
    if (match) {
      return JSON.parse(match[1].trim());
    }
    throw new Error("LLM response was not valid JSON: " + raw.slice(0, 300));
  }
}
