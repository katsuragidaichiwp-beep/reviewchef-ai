export async function onRequestPost({ request, env, params }) {
  let body;
  try {
    body = await request.json();
  } catch {
    return jsonResponse({ ok: false, error: "JSON body is required." }, 400);
  }

  const comment = String(body.comment || "").trim();
  if (!comment) {
    return jsonResponse({ ok: false, error: "comment is required." }, 400);
  }

  const reviewName = body.reviewName || buildReviewName(env.GBP_LOCATION_NAME, params.reviewId);
  if (body.action !== "publish") {
    return jsonResponse({
      ok: true,
      mode: "draft",
      reviewName,
      reply: { comment },
      message: "Reply normalized. Set action=publish after OAuth and reviewName are configured.",
    });
  }

  const accessToken = await getGoogleAccessToken(env);
  if (!reviewName || !accessToken) {
    return jsonResponse(
      {
        ok: false,
        error: "Google Business Profile review reply is not configured.",
        required: ["reviewName or GBP_LOCATION_NAME", "GOOGLE_GBP_ACCESS_TOKEN or GOOGLE_GBP_REFRESH_TOKEN"],
        reply: { comment },
      },
      501,
    );
  }

  const response = await fetch(`https://mybusiness.googleapis.com/v4/${reviewName}/reply`, {
    method: "PUT",
    headers: {
      authorization: `Bearer ${accessToken}`,
      "content-type": "application/json",
    },
    body: JSON.stringify({ comment }),
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
        error: "Google Business Profile review reply failed.",
        status: response.status,
        result,
        reply: { comment },
      },
      response.status,
    );
  }

  return jsonResponse({ ok: true, mode: "publish", result, postedAt: new Date().toISOString() });
}

function buildReviewName(locationName, reviewId) {
  if (!locationName || !reviewId) return "";
  if (reviewId.includes("/reviews/")) return reviewId;
  return `${locationName}/reviews/${reviewId}`;
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

function jsonResponse(body, status = 200) {
  return new Response(JSON.stringify(body, null, 2), {
    status,
    headers: {
      "content-type": "application/json; charset=utf-8",
      "cache-control": "no-store",
    },
  });
}
