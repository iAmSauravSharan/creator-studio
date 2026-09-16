// Run this in a SEPARATE terminal, alongside `npm run dev`:
//   node scheduler.js
// It calls /api/scheduler/check every minute. This is what actually makes
// Reddit "scheduling" fire — the app has to be running for this to work,
// since Reddit's API (unlike YouTube's) has no native future-publish.
const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000";
const INTERVAL_MS = 60_000;

async function tick() {
  try {
    const res = await fetch(`${BASE_URL}/api/scheduler/check`);
    const data = await res.json();
    if (data.checked > 0) {
      console.log(`[scheduler] checked ${data.checked} due post(s):`, data.results);
    }
  } catch (err) {
    console.error("[scheduler] check failed:", err.message);
  }
}

console.log(`[scheduler] running, checking ${BASE_URL}/api/scheduler/check every 60s. Ctrl+C to stop.`);
tick();
setInterval(tick, INTERVAL_MS);
