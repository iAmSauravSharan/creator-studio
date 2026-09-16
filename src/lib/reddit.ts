// Reddit OAuth (one app registration, many accounts can authorize it) +
// post submission. Same secrets philosophy as youtube.ts: only .env holds
// real tokens, the database only stores which env key to read.
//
// One-time setup (per README): register a "script" app at
// reddit.com/prefs/apps, put REDDIT_CLIENT_ID / REDDIT_CLIENT_SECRET in
// .env (these are app-wide, not per-account — one Reddit app registration
// can authorize multiple of your own accounts).
//
// Important limitation, called out in README too: Reddit's API has no
// native "publish at a future time" — a submitted post goes live
// immediately. Scheduling for later means OUR app holds the post and
// submits it at the right moment — see /api/scheduler/check.

const REDDIT_AUTH_BASE = "https://www.reddit.com/api/v1/authorize";
const REDDIT_TOKEN_URL = "https://www.reddit.com/api/v1/access_token";
const REDDIT_API_BASE = "https://oauth.reddit.com";
const USER_AGENT = "sirf-bhakti-pipeline/1.0 (personal use)";

export function buildRedditAuthUrl(state: string) {
  const params = new URLSearchParams({
    client_id: process.env.REDDIT_CLIENT_ID!,
    response_type: "code",
    state,
    redirect_uri: process.env.REDDIT_REDIRECT_URI!,
    duration: "permanent", // required to get a refresh_token back
    scope: "submit identity",
  });
  return `${REDDIT_AUTH_BASE}?${params.toString()}`;
}

export async function exchangeRedditCode(code: string) {
  const basicAuth = Buffer.from(`${process.env.REDDIT_CLIENT_ID}:${process.env.REDDIT_CLIENT_SECRET}`).toString("base64");
  const res = await fetch(REDDIT_TOKEN_URL, {
    method: "POST",
    headers: {
      Authorization: `Basic ${basicAuth}`,
      "Content-Type": "application/x-www-form-urlencoded",
      "User-Agent": USER_AGENT,
    },
    body: new URLSearchParams({
      grant_type: "authorization_code",
      code,
      redirect_uri: process.env.REDDIT_REDIRECT_URI!,
    }),
  });
  if (!res.ok) throw new Error(`Reddit token exchange failed: ${await res.text()}`);
  return res.json() as Promise<{ refresh_token: string; access_token: string }>;
}

async function getAccessToken(tokenEnvKey: string) {
  const refreshToken = process.env[tokenEnvKey];
  if (!refreshToken) throw new Error(`No refresh token found at .env key ${tokenEnvKey}`);

  const basicAuth = Buffer.from(`${process.env.REDDIT_CLIENT_ID}:${process.env.REDDIT_CLIENT_SECRET}`).toString("base64");
  const res = await fetch(REDDIT_TOKEN_URL, {
    method: "POST",
    headers: {
      Authorization: `Basic ${basicAuth}`,
      "Content-Type": "application/x-www-form-urlencoded",
      "User-Agent": USER_AGENT,
    },
    body: new URLSearchParams({ grant_type: "refresh_token", refresh_token: refreshToken }),
  });
  if (!res.ok) throw new Error(`Reddit access token refresh failed: ${await res.text()}`);
  const data = await res.json();
  return data.access_token as string;
}

export async function submitRedditPost({
  tokenEnvKey,
  subreddit,
  title,
  bodyText,
  flair,
}: {
  tokenEnvKey: string;
  subreddit: string;
  title: string;
  bodyText: string;
  flair?: string;
}) {
  const accessToken = await getAccessToken(tokenEnvKey);

  const params = new URLSearchParams({
    sr: subreddit,
    kind: "self", // text post — extend to "link" if you add link/media posts later
    title,
    text: bodyText,
    api_type: "json",
  });
  if (flair) params.set("flair_text", flair);

  const res = await fetch(`${REDDIT_API_BASE}/api/submit`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/x-www-form-urlencoded",
      "User-Agent": USER_AGENT,
    },
    body: params.toString(),
  });

  if (!res.ok) throw new Error(`Reddit submit failed: ${await res.text()}`);
  const data = await res.json();
  const errors = data?.json?.errors;
  if (errors?.length) throw new Error(`Reddit submit rejected: ${JSON.stringify(errors)}`);

  const postId = data?.json?.data?.name as string | undefined; // e.g. "t3_abc123"
  return postId;
}
