import { createOpenAiText, jsonResponse, parseJsonObject } from "./_shared.js";

export async function onRequestPost({ request, env }) {
  let body;
  try {
    body = await request.json();
  } catch {
    return jsonResponse({ ok: false, error: "JSON body is required." }, 400);
  }

  const review = body.review || {};
  const analysis = body.analysis || {};
  const settings = body.settings || {};
  const instructions = [
    "あなたは飲食店のGoogleレビュー返信を作る運用担当です。",
    "日本語で、店舗の信頼を守りながら自然で短い返信文だけを作成してください。",
    "事実未確認の謝罪や補償の約束を断定しないでください。",
    "P0/P1は改善姿勢と事実確認、P2は共感と改善、P3は感謝を中心にしてください。",
    "返答はJSONのみで {\"replyDraft\":\"...\"} の形式にしてください。",
  ].join("\n");

  const input = [
    `店舗名: ${settings.businessName || review.store || "店舗"}`,
    `返信トーン: ${settings.replyTone || "warm"}`,
    `投稿者: ${review.author || "匿名"}`,
    `星評価: ${review.rating || ""}`,
    `レビュー本文: ${review.comment || ""}`,
    `リスク: ${analysis.priority || ""}`,
    `要約: ${analysis.summary || ""}`,
    `前回案: ${body.currentDraft || ""}`,
    `作成回数: ${body.version || 1}`,
    "条件: 260字以内。過度な敬語、広告表現、来店強要は禁止。",
  ].join("\n");

  const ai = await createOpenAiText(env, { instructions, input });
  if (!ai.ok) return jsonResponse(ai.body, ai.status);

  const parsed = parseJsonObject(ai.body.outputText);
  const replyDraft = String(parsed.replyDraft || ai.body.outputText || "").trim();
  if (!replyDraft) {
    return jsonResponse({ ok: false, error: "OpenAI response did not include replyDraft.", raw: ai.body.outputText }, 502);
  }

  return jsonResponse({
    ok: true,
    replyDraft,
    model: ai.body.model,
    responseId: ai.body.responseId,
  });
}
