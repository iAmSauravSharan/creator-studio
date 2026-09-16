import { google } from "googleapis";
import fs from "fs";

// Multi-account: each Account row has a tokenEnvKey (e.g.
// "YOUTUBE_REFRESH_TOKEN_MAIN") naming which .env variable holds ITS
// refresh token. Tokens themselves never live in the database — only the
// name of where to find them in .env.
export function getOAuthClient(tokenEnvKey?: string | null) {
  const client = new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    process.env.GOOGLE_REDIRECT_URI
  );
  const refreshToken = tokenEnvKey ? process.env[tokenEnvKey] : undefined;
  if (refreshToken) {
    client.setCredentials({ refresh_token: refreshToken });
  }
  return client;
}

export async function uploadAndSchedule({
  tokenEnvKey,
  filePath,
  title,
  description,
  tags,
  categoryId,
  thumbnailPath,
  publishAt,
}: {
  tokenEnvKey: string;
  filePath: string;
  title: string;
  description: string;
  tags: string[];
  categoryId?: string;
  thumbnailPath?: string;
  publishAt: string;
}) {
  const auth = getOAuthClient(tokenEnvKey);
  const youtube = google.youtube({ version: "v3", auth });

  const insertRes = await youtube.videos.insert({
    part: ["snippet", "status"],
    requestBody: {
      snippet: { title, description, tags, categoryId: categoryId ?? "22" },
      status: { privacyStatus: "private", publishAt, selfDeclaredMadeForKids: false },
    },
    media: { body: fs.createReadStream(filePath) },
  });

  const videoId = insertRes.data.id!;

  if (thumbnailPath) {
    await youtube.thumbnails.set({ videoId, media: { body: fs.createReadStream(thumbnailPath) } });
  }

  return videoId;
}
