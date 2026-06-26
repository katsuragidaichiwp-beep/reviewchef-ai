import { createOpenAiText, jsonResponse, parseJsonObject } from "../../ai/_shared.js";

const DEFAULT_CHECK_KEYWORDS = [
  "食中毒",
  "腹痛",
  "下痢",
  "嘔吐",
  "病院",
  "救急",
  "体調",
  "吐き気",
  "アレルギー",
  "異物",
  "髪の毛",
  "虫",
  "ガラス",
  "カビ",
  "返金",
  "弁護士",
  "訴え",
  "警察",
  "保健所",
  "詐欺",
];

export async function onRequestPost({ request, env }) {
  let body;
  try {
    body = await request.json();
  } catch {
    return jsonResponse({ ok: false, error: "JSON body is required." }, 400);
  }

  const settings = normalizeSettings(body.settings || {});
  if (!settings.enabled) {
    return jsonResponse({ ok: true, mode: "disabled", posted: [], scheduled: [], blocked: [] });
  }

  const reviews = Array.isArray(body.reviews) ? body.reviews : [];
  const force = Boolean(body.force);
  const action = body.action || "dry_run";
  const now = new Date(body.now || Date.now());
  const result = { ok: true, mode: action, posted: [], scheduled: [], blocked: [], skipped: [], failed: [] };

  for (const review of reviews) {
    const decision = classifyReview(review, settings, now);
    if (decision.skipReason) {
      result.skipped.push({ reviewId: review.id, reason: decision.skipReason });
      continue;
    }
    if (decision.blockedReason) {
      result.blocked.push({ reviewId: review.id, status: "needs_check", reason: decision.blockedReason });
      continue;
    }
    if (!force && !decision.due) {
      result.scheduled.push({ reviewId: review.id, status: "auto_scheduled", scheduledAt: decision.scheduledAt });
      continue;
    }

    const reply = await buildAutoReply(env, review, settings);
    if (!reply.ok) {
      result.failed.push({ reviewId: review.id, error: reply.error });
      continue;
    }

    if (action !== "publish") {
      result.posted.push({
        reviewId: review.id,
        mode: "prepared",
        scheduledAt: decision.scheduledAt,
        reply: reply.text,
      });
      continue;
    }

    const publishResult = await publishReply(env, review, reply.text);
    if (publishResult.ok) {
      result.posted.push({
        reviewId: review.id,
        mode: "publish",
        scheduledAt: decision.scheduledAt,
        reply: reply.text,
        google: publishResult.result,
      });
    } else {
      result.failed.push({ reviewId: review.id, error: publishResult.error, status: publishResult.status });
    }
  }

  return jsonResponse(result);
}

function normalizeSettings(settings) {
  const ratings = Array.isArray(settings.autoReplyRatings)
    ? settings.autoReplyRatings.map(Number).filter((rating) => rating >= 1 && rating <= 5)
    : [5];
  return {
    enabled: Boolean(settings.autoReplyEnabled ?? settings.enabled),
    ratings: [...new Set(ratings)],
    runAt: normalizeTimeValue(settings.autoReplyRunAt || settings.runAt || "23:00"),
    checkKeywords: parseKeywords(settings.autoReplyCheckKeywords || settings.checkKeywords).concat(DEFAULT_CHECK_KEYWORDS),
    businessName: settings.businessName || "店舗",
    replyTone: settings.replyTone || "warm",
  };
}

function classifyReview(review, settings, now) {
  if (!review?.id) return { skipReason: "review.id is required." };
  if (review.status === "replied") return { skipReason: "already replied." };
  if (!settings.ratings.includes(Number(review.rating))) return { skipReason: "rating is not selected." };

  const comment = String(review.comment || "");
  const matchedKeywords = [...new Set(settings.checkKeywords.filter((keyword) => keyword && comment.includes(keyword)))];
  if (matchedKeywords.length) return { blockedReason: matchedKeywords.join("・") };

  const scheduledAt = buildScheduledAt(review.createdAt || review.googleCreatedAt, settings.runAt);
  return {
    scheduledAt,
    due: new Date(scheduledAt).getTime() <= now.getTime(),
  };
}

async function buildAutoReply(env, review, settings) {
  const fallback = buildLocalReply(review, settings);
  if (!env.OPENAI_API_KEY) return { ok: true, text: fallback, source: "local" };

  const instructions = [
    "あなたは飲食店のGoogleレビュー返信を作る運用担当です。",
    "レビュー本文に具体的に触れながら、自然で短い返信文を作ってください。",
    "返金、補償、健康被害、法的責任を断定しないでください。",
    "返答はJSONのみで {\"reply\":\"...\"} の形式にしてください。",
  ].join("\n");
  const input = [
    `店舗名: ${settings.businessName}`,
    `返信トーン: ${settings.replyTone}`,
    `投稿者: ${review.author || review.authorName || "匿名"}`,
    `星評価: ${review.rating}`,
    `レビュー本文: ${review.comment || ""}`,
    "条件: 260字以内。広告っぽくしない。ユーザー承認なしで公開されるため安全な表現にする。",
  ].join("\n");

  const ai = await createOpenAiText(env, { instructions, input });
  if (!ai.ok) return { ok: true, text: fallback, source: "local_fallback", error: ai.body?.error };
  const parsed = parseJsonObject(ai.body.outputText);
  return { ok: true, text: String(parsed.reply || ai.body.outputText || fallback).trim(), source: "openai" };
}

function buildLocalReply(review, settings) {
  const name = settings.businessName || "当店";
  if (Number(review.rating) >= 4) {
    return `${review.author || "お客様"}様、ご来店と温かい口コミをありがとうございます。${name}でのお食事を楽しんでいただけたようで大変うれしく思います。またのご来店を心よりお待ちしております。`;
  }
  return `${review.author || "お客様"}様、ご来店と貴重なご意見をありがとうございます。いただいた内容を店舗内で共有し、よりよい体験につなげてまいります。`;
}

async function publishReply(env, review, comment) {
  const reviewName = review.googleReviewName || buildReviewName(env.GBP_LOCATION_NAME, review.id);
  const accessToken = await getGoogleAccessToken(env);
  if (!reviewName || !accessToken) {
    return {
      ok: false,
      status: 501,
      error: "Google Business Profile review reply is not configured.",
    };
  }

  const response = await fetch(`https://mybusiness.googleapis.com/v4/${reviewName}/reply`, {
    method: "PUT",
    headers: {
      authorization: `Bearer ${accessToken}`,
      "content-type": "application/json",
    },
    body: JSON.stringify({ comment }),
  });
  const result = await parseResponse(response);
  if (!response.ok) {
    return { ok: false, status: response.status, error: "Google Business Profile review reply failed.", result };
  }
  return { ok: true, result };
}

function buildReviewName(locationName, reviewId) {
  if (!locationName || !reviewId) return "";
  if (String(reviewId).includes("/reviews/")) return reviewId;
  return `${locationName}/reviews/${reviewId}`;
}

async function getGoogleAccessToken(env) {
  if (env.GOOGLE_GBP_ACCESS_TOKEN) return env.GOOGLE_GBP_ACCESS_TOKEN;
  if (!env.GOOGLE_GBP_REFRESH_TOKEN || !env.GOOGLE_CLIENT_ID || !env.GOOGLE_CLIENT_SECRET) return "";

  const response = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: env.GOOGLE_CLIENT_ID,
      client_secret: env.GOOGLE_CLIENT_SECRET,
      refresh_token: env.GOOGLE_GBP_REFRESH_TOKEN,
      grant_type: "refresh_token",
    }),
  });
  if (!response.ok) return "";
  const data = await response.json();
  return data.access_token || "";
}

function normalizeTimeValue(value) {
  const match = String(value || "").match(/^([01]\d|2[0-3]):([0-5]\d)$/);
  return match ? `${match[1]}:${match[2]}` : "23:00";
}

function parseKeywords(value) {
  if (Array.isArray(value)) return value.map(String).map((keyword) => keyword.trim()).filter(Boolean);
  return String(value || "").split(/[、,\n]+/).map((keyword) => keyword.trim()).filter(Boolean);
}

function buildScheduledAt(createdAtValue, runAt) {
  const createdAt = parseDate(createdAtValue) || new Date();
  const [hour, minute] = normalizeTimeValue(runAt).split(":").map(Number);
  const scheduledAt = new Date(createdAt);
  scheduledAt.setHours(hour, minute, 0, 0);
  if (createdAt.getTime() > scheduledAt.getTime()) scheduledAt.setDate(scheduledAt.getDate() + 1);
  return scheduledAt.toISOString();
}

function parseDate(value) {
  if (!value) return null;
  const date = new Date(String(value).includes("T") ? value : `${value}T00:00:00`);
  return Number.isNaN(date.getTime()) ? null : date;
}

async function parseResponse(response) {
  const text = await response.text();
  try {
    return JSON.parse(text);
  } catch {
    return { raw: text };
  }
}
