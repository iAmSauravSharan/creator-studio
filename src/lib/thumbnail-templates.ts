// Thumbnail prompt templates. Each one is a starting structure — you supply
// {custom_idea} (and sometimes {deity}/{occasion}) at generation time, and
// the brand constants (color scheme, art style, aspect ratio) from Settings
// get appended automatically so every thumbnail stays visually consistent
// regardless of which template you used.
//
// Add more templates here any time — just follow the same shape. No
// database or migration needed for new templates, this is plain code.

export type ThumbnailTemplate = {
  id: string;
  name: string;
  description: string;
  // Use {deity}, {occasion}, {custom_idea} as placeholders — they get
  // substituted with the song's fields and your typed-in idea.
  promptTemplate: string;
};

export const THUMBNAIL_TEMPLATES: ThumbnailTemplate[] = [
  {
    id: "temple-glow",
    name: "Temple Glow",
    description: "A temple silhouette with warm ambient light — good default for aarti content.",
    promptTemplate:
      "A serene temple silhouette dedicated to {deity}, glowing diyas lining the steps, " +
      "soft golden ambient light, gentle haze in the air. {custom_idea}",
  },
  {
    id: "iconographic-minimal",
    name: "Iconographic Minimal",
    description: "A clean, symbolic/minimal composition built around a sacred symbol rather than a full scene — good for shorter or more meditative content.",
    promptTemplate:
      "A minimal, elegant illustration centered on a sacred symbol associated with {deity} " +
      "(for {occasion}), plenty of negative space, restrained and calm composition. {custom_idea}",
  },
  {
    id: "nature-devotional",
    name: "Nature Devotional",
    description: "A natural setting — river ghat, mountain shrine, forest temple — for a more contemplative, slow mood.",
    promptTemplate:
      "A peaceful natural devotional setting evoking {deity} and {occasion} — think a river ghat at dawn, " +
      "a mountain shrine, or a quiet forest temple, soft mist, warm early light. {custom_idea}",
  },
];

export function buildThumbnailPrompt({
  templateId,
  customIdea,
  deity,
  occasion,
  brandColorScheme,
  brandArtStyle,
  nicheDescription,
}: {
  templateId: string;
  customIdea: string;
  deity: string;
  occasion: string;
  brandColorScheme: string;
  brandArtStyle: string;
  nicheDescription: string;
}) {
  const template = THUMBNAIL_TEMPLATES.find((t) => t.id === templateId) ?? THUMBNAIL_TEMPLATES[0];

  const filled = template.promptTemplate
    .replace(/{deity}/g, deity || "a Hindu deity")
    .replace(/{occasion}/g, occasion || "")
    .replace(/{custom_idea}/g, customIdea || "");

  // Brand constants always appended last, so they're never accidentally
  // overridden by a template's own wording, and constraints (no text, no
  // photorealistic faces) always apply regardless of which template or
  // custom idea was used.
  return (
    `${filled} Style: ${brandArtStyle}. Color palette: ${brandColorScheme}. ` +
    `Context: ${nicheDescription}. No readable text or lettering in the image. ` +
    `Leave the lower third of the frame visually simple for a text overlay to be added separately.`
  );
}
