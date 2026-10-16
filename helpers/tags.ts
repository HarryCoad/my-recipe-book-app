// Mirrors the API's tag rules (utils/tagUtils.ts in the backend), so the form shows tags exactly as
// they'll be saved and catches the limits before sending

export const MAX_TAGS = 10;
export const MAX_TAG_LENGTH = 30;

// Trim, collapse repeated spaces and lowercase, so " Gluten  Free" becomes "gluten free"
export const normaliseTag = (tag: string) => tag.trim().replace(/\s+/g, ' ').toLowerCase();

// Normalises each tag, then removes duplicates and empty tags
export const normaliseTags = (tags: string[]) =>
  Array.from(new Set(tags.map(normaliseTag))).filter((tag) => tag !== '');
