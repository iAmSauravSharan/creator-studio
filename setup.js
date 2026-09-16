// One-command setup: `npm run setup`
// Creates .env from the template if missing, generates the Prisma client,
// and creates/applies the local SQLite database. Safe to re-run.
const fs = require("fs");
const path = require("path");
const { execSync } = require("child_process");

const root = process.cwd();
const envPath = path.join(root, ".env");
const envExamplePath = path.join(root, ".env.example");

if (!fs.existsSync(envPath)) {
  fs.copyFileSync(envExamplePath, envPath);
  console.log("Created .env from .env.example — open it and fill in your keys before running npm run dev.");
} else {
  console.log(".env already exists — leaving it as is.");
}

const uploadsDir = path.join(root, "public", "uploads");
if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true });

console.log("Generating Prisma client…");
execSync("npx prisma generate", { stdio: "inherit" });

const migrationsDir = path.join(root, "prisma", "migrations");
const hasMigrations = fs.existsSync(migrationsDir) && fs.readdirSync(migrationsDir).length > 0;

if (hasMigrations) {
  console.log("Applying existing migrations…");
  execSync("npx prisma migrate deploy", { stdio: "inherit" });
} else {
  console.log("Creating the database for the first time…");
  execSync("npx prisma migrate dev --name init", { stdio: "inherit" });
}

console.log("\nSetup complete. Next: open .env and fill in your Google OAuth keys, then run `npm run dev`.");
console.log("(Setting up Turso for multi-PC sync? See the README section \"Setting up Turso\" — you'll run one more command after this to push today's schema to it.)");
