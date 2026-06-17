import { createOpenAiText, jsonResponse, parseJsonObject } from "./_shared.js";

export async function onRequestPost({ request, env }) {
  let body;
  try {
    body = await request.json();
  } catch {
    return jsonResponse({ ok: false, error: "JSON body is required." }, 400);
  }

  const instructions = [
    "あなたは飲食店のGoogle Business Profile店舗投稿を作るMEO運用担当です。",
    "Google検索やGoogleマップで見た人が来店・予約しやすい短い投稿文を作成してください。",
    "誇大表現、根拠のない順位表現、医療的・法的な断定は禁止です。",
    "返答はJSONのみで {\"summary\":\"...\"} の形式にしてください。",
  ].join("\n");

  const input = [
    `店舗名: ${body.store || "店舗"}`,
    `投稿タイプ: ${body.topicType || "STANDARD"}`,
    `タイトル/テーマ: ${body.title || ""}`,
    `現行案: ${body.summary || ""}`,
    `CTA: ${body.actionType || "LEARN_MORE"}`,
    `URL: ${body.url || ""}`,
    `作成回数: ${body.version || 1}`,
    "条件: 500字以内。冒頭で来店理由が伝わること。最後に自然な行動導線を入れること。",
  ].join("\n");

  const ai = await createOpenAiText(env, { instructions, input });
  if (!ai.ok) return jsonResponse(ai.body, ai.status);

  const parsed = parseJsonObject(ai.body.outputText);
  const summary = String(parsed.summary || ai.body.outputText || "").trim();
  if (!summary) {
    return jsonResponse({ ok: false, error: "OpenAI response did not include summary.", raw: ai.body.outputText }, 502);
  }

  return jsonResponse({
    ok: true,
    summary,
    model: ai.body.model,
    responseId: ai.body.responseId,
  });
}
