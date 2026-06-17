export async function onRequestGet({ request, env }) {
  const url = new URL(request.url);
  return jsonResponse({
    ok: true,
    service: "ReviewChef GBP posts",
    endpoint: `${url.origin}/api/gbp/posts`,
    googleBusinessProfileConfigured: Boolean(env.GBP_LOCATION_NAME && (env.GOOGLE_GBP_ACCESS_TOKEN || env.GOOGLE_GBP_REFRESH_TOKEN)),
    requiredForPublish: [
      "GBP_LOCATION_NAME",
      "GOOGLE_GBP_ACCESS_TOKEN or GOOGLE_GBP_REFRESH_TOKEN",
      "GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET when using refresh token",
    ],
    supportedActions: ["draft", "publish"],
  });
}

export async function onRequestPost({ request, env }) {
  let body;
  try {
    body = await request.json();
  } catch {
    return jsonResponse({ ok: false, error: "JSON body is required." }, 400);
  }

  const localPost = buildLocalPost(body);
  const action = body.action || "draft";
  if (action !== "publish") {
    return jsonResponse({
      ok: true,
      mode: "draft",
      localPost,
      message: "Draft normalized. Set action=publish after OAuth and location are configured.",
    });
  }

  const parent = body.parent || body.locationName || env.GBP_LOCATION_NAME;
  const accessToken = await getGoogleAccessToken(env);
  if (!parent || !accessToken) {
    return jsonResponse(
      {
        ok: false,
        error: "Google Business Profile publish is not configured.",
        required: ["GBP_LOCATION_NAME", "GOOGLE_GBP_ACCESS_TOKEN or GOOGLE_GBP_REFRESH_TOKEN"],
        localPost,
      },
      501,
    );
  }

  const response = await fetch(`https://mybusiness.googleapis.com/v4/${parent}/localPosts`, {
    method: "POST",
    headers: {
      authorization: `Bearer ${accessToken}`,
      "content-type": "application/json",
    },
    body: JSON.stringify(localPost),
  });

  const resultText = await response.text();
  let result;
  try {
    result = JSON.parse(resultText);
  } catch {
    result = { raw: resultText };
  }

  if (!response.ok) {
    return jsonResponse(
      {
        ok: false,
        error: "Google Business Profile LocalPosts API failed.",
        status: response.status,
        result,
        localPost,
      },
      response.status,
    );
  }

  return jsonResponse({ ok: true, mode: "publish", result, localPost });
}

function buildLocalPost(body) {
  const topicType = body.topicType || body.type || "STANDARD";
  const actionType = body.actionType || body.cta || "LEARN_MORE";
  const localPost = {
    languageCode: body.languageCode || "ja",
    summary: trimText(body.summary || body.body || "", 1500),
    topicType,
  };

  if (actionType && actionType !== "NONE") {
    localPost.callToAction = { actionType };
    if (actionType !== "CALL" && body.url) {
      localPost.callToAction.url = body.url;
    }
  }

  if (topicType === "EVENT" || body.startDate || body.endDate) {
    localPost.event = {
      title: trimText(body.title || "店舗イベント", 58),
      schedule: {
        startDate: toGoogleDate(body.startDate),
        endDate: toGoogleDate(body.endDate || body.startDate),
      },
    };
  }

  return localPost;
}

async function getGoogleAccessToken(env) {
  if (env.GOOGLE_GBP_ACCESS_TOKEN) return env.GOOGLE_GBP_ACCESS_TOKEN;
  if (!env.GOOGLE_GBP_REFRESH_TOKEN || !env.GOOGLE_CLIENT_ID || !env.GOOGLE_CLIENT_SECRET) return "";

  const params = new URLSearchParams({
    client_id: env.GOOGLE_CLIENT_ID,
    client_secret: env.GOOGLE_CLIENT_SECRET,
    refresh_token: env.GOOGLE_GBP_REFRESH_TOKEN,
    grant_type: "refresh_token",
  });
  const response = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body: params,
  });
  if (!response.ok) return "";
  const data = await response.json();
  return data.access_token || "";
}

function toGoogleDate(value) {
  const date = value ? new Date(`${value}T00:00:00`) : new Date();
  return {
    year: date.getFullYear(),
    month: date.getMonth() + 1,
    day: date.getDate(),
  };
}

function trimText(value, maxLength) {
  const text = String(value || "").trim();
  return text.length > maxLength ? text.slice(0, maxLength) : text;
}

function jsonResponse(body, status = 200) {
  return new Response(JSON.stringify(body, null, 2), {
    status,
    headers: {
      "content-type": "application/json; charset=utf-8",
      "cache-control": "no-store",
    },
  });
}
