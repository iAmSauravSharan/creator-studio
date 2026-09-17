// Thumbnail prompt templates now live in the ThumbnailLayout table (see
// prisma/schema.prisma) instead of a hardcoded array, so they're editable
// from Settings > Thumbnail templates without a code change or redeploy.
//
// Placeholders in a template's promptTemplate: {deity}, {occasion},
// {custom_idea} — substituted with the post's fields and the typed-in idea.
// Brand constants (color scheme, art style, niche) from Settings get
// appended automatically, so every thumbnail stays visually consistent
// regardless of which template was used.

import { prisma } from "@/lib/db";

export async function buildThumbnailPrompt({
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
  const template =
    (await prisma.thumbnailLayout.findUnique({ where: { id: templateId } })) ??
    (await prisma.thumbnailLayout.findFirst({ where: { isActive: true }, orderBy: { createdAt: "asc" } }));

  if (!template) {
    throw new Error(
      "No thumbnail templates found. Add one in Settings > Thumbnail templates before generating."
    );
  }

  const filled = template.promptTemplate
    .replace(/{deity}/g, deity || "a Hindu deity")
    .replace(/{occasion}/g, occasion || "")
    .replace(/{custom_idea}/g, customIdea || "");

  return (
    `${filled} Style: ${brandArtStyle}. Color palette: ${brandColorScheme}. ` +
    `Context: ${nicheDescription}. No readable text or lettering in the image. ` +
    `Leave the lower third of the frame visually simple for a text overlay to be added separately.`
  );
}
