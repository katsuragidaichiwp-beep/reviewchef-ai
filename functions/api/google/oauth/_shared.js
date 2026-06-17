export const GOOGLE_BUSINESS_PROFILE_SCOPE = "https://www.googleapis.com/auth/business.manage";
export const GOOGLE_AUTH_URL = "https://accounts.google.com/o/oauth2/v2/auth";
export const GOOGLE_TOKEN_URL = "https://oauth2.googleapis.com/token";

export function jsonResponse(body, status = 200) {
  return new Response(JSON.stringify(body, null, 2), {
    status,
    headers: {
      "content-type": "application/json; charset=utf-8",
      "cache-control": "no-store",
    },
  });
}

export function missingEnvResponse(required) {
  return jsonResponse(
    {
      ok: false,
      error: "Google OAuth is not configured.",
      required,
    },
    501,
  );
}

export function buildState({ state, storeId }) {
  if (state) return state;
  if (!storeId) return "";
  return JSON.stringify({ storeId });
}
