import { GOOGLE_TOKEN_URL, jsonResponse, missingEnvResponse } from "./_shared.js";

export async function onRequestGet({ request, env }) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code") || "";
  const state = url.searchParams.get("state") || "";
  const error = url.searchParams.get("error") || "";

  if (error) {
    return jsonResponse(
      {
        ok: false,
        error: "Google OAuth returned an error.",
        googleError: error,
        state,
      },
      400,
    );
  }

  if (!code) {
    return jsonResponse({ ok: false, error: "code is required.", state }, 400);
  }

  if (!env.GOOGLE_CLIENT_ID || !env.GOOGLE_REDIRECT_URI) {
    return missingEnvResponse(["GOOGLE_CLIENT_ID", "GOOGLE_REDIRECT_URI"]);
  }

  const tokenPayload = {
    client_id: env.GOOGLE_CLIENT_ID,
    code,
    grant_type: "authorization_code",
    redirect_uri: env.GOOGLE_REDIRECT_URI,
  };
  const requiredEnv = ["GOOGLE_CLIENT_ID", "GOOGLE_REDIRECT_URI", "GOOGLE_CLIENT_SECRET"];

  if (!env.GOOGLE_CLIENT_SECRET) {
    return jsonResponse({
      ok: true,
      mode: "prepared",
      state,
      tokenEndpoint: GOOGLE_TOKEN_URL,
      tokenPayload,
      requiredEnv,
      message: "Set GOOGLE_CLIENT_SECRET to exchange this authorization code server-side.",
    });
  }

  const tokenParams = new URLSearchParams({
    ...tokenPayload,
    client_secret: env.GOOGLE_CLIENT_SECRET,
  });
  const response = await fetch(GOOGLE_TOKEN_URL, {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body: tokenParams,
  });
  const result = await parseGoogleResponse(response);

  if (!response.ok) {
    return jsonResponse(
      {
        ok: false,
        mode: "exchange",
        state,
        status: response.status,
        result,
      },
      response.status,
    );
  }

  return jsonResponse({
    ok: true,
    mode: "exchange",
    state,
    tokenEndpoint: GOOGLE_TOKEN_URL,
    tokenPayload,
    token: redactTokenResult(result),
    message: "Token exchange completed. Persist refresh/access tokens only in a dedicated secret store; this endpoint does not save them.",
  });
}

async function parseGoogleResponse(response) {
  const text = await response.text();
  try {
    return JSON.parse(text);
  } catch {
    return { raw: text };
  }
}

function redactTokenResult(result) {
  return {
    accessTokenReceived: Boolean(result.access_token),
    refreshTokenReceived: Boolean(result.refresh_token),
    expiresIn: result.expires_in,
    scope: result.scope,
    tokenType: result.token_type,
  };
}
