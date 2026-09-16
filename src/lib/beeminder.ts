// Beeminder is a commitment device: you set a weekly "do more" target and
// pledge real money. Miss the target and it charges your card automatically.
// Setup (one-time, ~10 minutes):
//   1. Create a free account at beeminder.com
//   2. Create a goal, type "Do More", e.g. "bhakti-uploads"
//      - Set the rate to match Settings > "Beeminder weekly goal rate" in
//        the dashboard (start at 3-4/week, raise it later — Beeminder
//        enforces a one-week delay on rate increases by design)
//      - Set a real pledge amount once the free trial period ends — $5-10
//        is enough to sting without being reckless
//   3. Get your API token from beeminder.com/api/v1/auth_token.json (login
//      required) and your goal slug from the goal's URL
//   4. Add BEEMINDER_USERNAME, BEEMINDER_GOAL, BEEMINDER_AUTH_TOKEN to .env
//      (the rate itself lives on Beeminder's side — the dashboard's
//      settings field is just a mirror so you have one place to see it)

export async function pushWeeklyDatapoint() {
  const { BEEMINDER_USERNAME, BEEMINDER_GOAL, BEEMINDER_AUTH_TOKEN } = process.env;
  if (!BEEMINDER_USERNAME || !BEEMINDER_GOAL || !BEEMINDER_AUTH_TOKEN) {
    console.warn("Beeminder env vars not set — skipping accountability datapoint");
    return;
  }

  const url = `https://www.beeminder.com/api/v1/users/${BEEMINDER_USERNAME}/goals/${BEEMINDER_GOAL}/datapoints.json`;

  await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      auth_token: BEEMINDER_AUTH_TOKEN,
      value: 1,
      comment: "Song scheduled via Sirf Bhakti Songs pipeline",
    }),
  });
}
