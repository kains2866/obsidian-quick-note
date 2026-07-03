export function mergeSelectedText(draftContent: string, selectedText: string): string {
  const trimmed = selectedText.trim();
  if (!trimmed) return draftContent;

  const paragraphs = draftContent
    .split(/\n\n+/)
    .map((paragraph) => paragraph.trim())
    .filter(Boolean);

  if (paragraphs.some((paragraph) => paragraph === trimmed)) {
    return draftContent;
  }

  return draftContent ? `${draftContent}\n\n${trimmed}` : trimmed;
}
