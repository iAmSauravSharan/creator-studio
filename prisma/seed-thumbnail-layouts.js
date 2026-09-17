// One-time seed for the templates that used to be hardcoded in
// src/lib/thumbnail-templates.ts. Run once after migrating:
//   node prisma/seed-thumbnail-layouts.js
// Safe to re-run — skips any name that already exists.

const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

const DEFAULTS = [
  {
    name: "Temple Glow",
    description: "A temple silhouette with warm ambient light — good default for aarti content.",
    promptTemplate:
      "A serene temple silhouette dedicated to {deity}, glowing diyas lining the steps, " +
      "soft golden ambient light, gentle haze in the air. {custom_idea}",
  },
  {
    name: "Iconographic Minimal",
    description: "A clean, symbolic/minimal composition built around a sacred symbol rather than a full scene — good for shorter or more meditative content.",
    promptTemplate:
      "A minimal, elegant illustration centered on a sacred symbol associated with {deity} " +
      "(for {occasion}), plenty of negative space, restrained and calm composition. {custom_idea}",
  },
  {
    name: "Nature Devotional",
    description: "A natural setting — river ghat, mountain shrine, forest temple — for a more contemplative, slow mood.",
    promptTemplate:
      "A peaceful natural devotional setting evoking {deity} and {occasion} — think a river ghat at dawn, " +
      "a mountain shrine, or a quiet forest temple, soft mist, warm early light. {custom_idea}",
  },
];

async function main() {
  for (const t of DEFAULTS) {
    const existing = await prisma.thumbnailLayout.findFirst({ where: { name: t.name } });
    if (existing) { console.log(`skip (exists): ${t.name}`); continue; }
    await prisma.thumbnailLayout.create({ data: t });
    console.log(`created: ${t.name}`);
  }
}

main().finally(() => prisma.$disconnect());
