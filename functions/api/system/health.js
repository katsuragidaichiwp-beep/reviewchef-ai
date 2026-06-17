export async function onRequestGet({ env }) {
  return jsonResponse({
    ok: true,
    service: "ReviewChef AI",
    checks: {
      line: {
        channelSecret: Boolean(env.LINE_CHANNEL_SECRET),
        channelAccessToken: Boolean(env.LINE_CHANNEL_ACCESS_TOKEN),
      },
      googleBusinessProfile: {
        locationName: Boolean(env.GBP_LOCATION_NAME),
        accessToken: Boolean(env.GOOGLE_GBP_ACCESS_TOKEN),
        refreshToken: Boolean(env.GOOGLE_GBP_REFRESH_TOKEN),
      },
      openai: {
        apiKey: Boolean(env.OPENAI_API_KEY),
        model: env.OPENAI_MODEL || "gpt-5.5",
      },
    },
  });
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
