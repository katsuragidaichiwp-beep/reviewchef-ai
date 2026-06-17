export async function createOpenAiText(env, { instructions, input }) {
  if (!env.OPENAI_API_KEY) {
    return {
      ok: false,
      status: 501,
      body: {
        ok: false,
        error: "OPENAI_API_KEY is not configured.",
        required: ["OPENAI_API_KEY"],
      },
    };
  }

  const model = env.OPENAI_MODEL || "gpt-5.5";
  const response = await fetch("https://api.openai.com/v1/responses", {
    method: "POST",
    headers: {
      authorization: `Bearer ${env.OPENAI_API_KEY}`,
      "content-type": "application/json",
    },
    body: JSON.stringify({
      model,
      reasoning: { effort: "low" },
      instructions,
      input,
    }),
  });

  const result = await parseResponse(response);
  if (!response.ok) {
    return {
      ok: false,
      status: response.status,
      body: {
        ok: false,
        error: "OpenAI Responses API failed.",
        status: response.status,
        result,
      },
    };
  }

  return {
    ok: true,
    status: 200,
    body: {
      ok: true,
      model,
      outputText: extractOutputText(result),
      responseId: result.id,
    },
  };
}

export function jsonResponse(body, status = 200) {
  return new Response(JSON.stringify(body, null, 2), {
    status,
    headers: {
      "content-type": "application/json; charset=utf-8",
      "cache-control": "no-store",
    },
  });
}

export function parseJsonObject(text) {
  const raw = String(text || "").trim();
  if (!raw) return {};
  const withoutFence = raw.replace(/^```(?:json)?/i, "").replace(/```$/i, "").trim();
  try {
    return JSON.parse(withoutFence);
  } catch {
    const start = withoutFence.indexOf("{");
    const end = withoutFence.lastIndexOf("}");
    if (start >= 0 && end > start) {
      try {
        return JSON.parse(withoutFence.slice(start, end + 1));
      } catch {
        return {};
      }
    }
    return {};
  }
}

async function parseResponse(response) {
  const text = await response.text();
  try {
    return JSON.parse(text);
  } catch {
    return { raw: text };
  }
}

function extractOutputText(result) {
  if (typeof result.output_text === "string") return result.output_text;
  const pieces = [];
  for (const output of result.output || []) {
    for (const content of output.content || []) {
      if (typeof content.text === "string") pieces.push(content.text);
    }
  }
  return pieces.join("\n").trim();
}
