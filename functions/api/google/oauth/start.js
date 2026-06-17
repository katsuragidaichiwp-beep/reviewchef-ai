import { GOOGLE_AUTH_URL, GOOGLE_BUSINESS_PROFILE_SCOPE, buildState, missingEnvResponse } from "./_shared.js";

export async function onRequestGet({ request, env }) {
  if (!env.GOOGLE_CLIENT_ID || !env.GOOGLE_REDIRECT_URI) {
    return missingEnvResponse(["GOOGLE_CLIENT_ID", "GOOGLE_REDIRECT_URI"]);
  }

  const url = new URL(request.url);
  const storeId = url.searchParams.get("storeId") || "";
  const state = buildState({
    state: url.searchParams.get("state") || "",
    storeId,
  });

  const authUrl = new URL(GOOGLE_AUTH_URL);
  authUrl.searchParams.set("client_id", env.GOOGLE_CLIENT_ID);
  authUrl.searchParams.set("redirect_uri", env.GOOGLE_REDIRECT_URI);
  authUrl.searchParams.set("response_type", "code");
  authUrl.searchParams.set("scope", GOOGLE_BUSINESS_PROFILE_SCOPE);
  authUrl.searchParams.set("access_type", "offline");
  authUrl.searchParams.set("include_granted_scopes", "true");
  if (state) authUrl.searchParams.set("state", state);

  return new Response(null, {
    status: 302,
    headers: {
      location: authUrl.toString(),
      "cache-control": "no-store",
    },
  });
}
