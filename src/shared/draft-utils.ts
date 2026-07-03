function splitParagraphs(content: string): string[] {
  return content
    .split(/\n\n+/)
    .map((paragraph) => paragraph.trim())
    .filter(Boolean);
}

export function mergeSelectedText(draftContent: string, selectedText: string): string {
  const trimmed = selectedText.trim();
  if (!trimmed) return draftContent;

  const draftParagraphs = splitParagraphs(draftContent);
  const selectedParagraphs = splitParagraphs(trimmed);

  // If any paragraph from the selection already exists in the draft, treat the
  // whole selection as a duplicate to avoid partial repeats.
  const hasDuplicate = selectedParagraphs.some((selectedParagraph) =>
    draftParagraphs.some((draftParagraph) => draftParagraph === selectedParagraph),
  );

  if (hasDuplicate) {
    return draftContent;
  }

  return draftContent ? `${draftContent}\n\n${trimmed}` : trimmed;
}
