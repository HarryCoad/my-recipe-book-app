import axios from '@/helpers/axios';
import { endpoints } from '@/helpers/endpoints';
import { ImportResponse, ImportResult } from '@/types/recipe';

// Reading recipes from web pages and photos, shared by the single and bulk imports. See
// "Importing recipes" in the API docs

// The API's limits for photos
export const IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
export const MAX_IMAGE_BYTES = 5 * 1024 * 1024;
// A recipe split across pages, such as a cookbook spread, is read from up to this many photos
export const MAX_IMAGES_PER_RECIPE = 4;

// One recipe to import: a web page, or the photos of one recipe in page order
export type ImportJob = { kind: 'url'; url: string } | { kind: 'image'; files: File[] };

// A full web address. Typing "example.com/pancakes" is common, so https:// is added if it's
// missing. Null if it still isn't an http(s) address
export const toImportUrl = (text: string) => {
  const trimmed = text.trim();
  if (!trimmed) {
    return null;
  }
  const withScheme = /^[a-z][a-z\d+.-]*:/i.test(trimmed) ? trimmed : `https://${trimmed}`;
  try {
    const url = new URL(withScheme);
    return ['http:', 'https:'].includes(url.protocol) && url.hostname.includes('.')
      ? url.toString()
      : null;
  } catch {
    return null;
  }
};

// Why a photo can't be used, checked before uploading it, or null if it's fine. The API checks
// again, from the file's content rather than its type
export const checkImage = (file: File) => {
  if (!IMAGE_TYPES.includes(file.type)) {
    return 'Please choose a JPEG, PNG, GIF or WebP image.';
  }
  if (file.size > MAX_IMAGE_BYTES) {
    return 'That image is too big. Please use one under 5 MB.';
  }
  return null;
};

export type ImportOptions = {
  skipReview?: boolean;
  allowDuplicate?: boolean;
  signal?: AbortSignal;
};

// Sends one import. Photos go as form data, where the API reads the flags as the text "true"
export const sendImport = async (
  job: ImportJob,
  { skipReview = false, allowDuplicate = false, signal }: ImportOptions = {}
): Promise<ImportResult> => {
  if (job.kind === 'url') {
    const body = {
      url: job.url,
      ...(skipReview && { bSkipReview: true }),
      ...(allowDuplicate && { bAllowDuplicate: true }),
    };
    const res = await axios.post<ImportResponse>(endpoints.recipes.importUrl, body, { signal });
    return res.data.data;
  }

  const form = new FormData();
  // Several photos in the same field are read together, in this order, as one recipe
  job.files.forEach((file) => form.append('image', file));
  if (skipReview) {
    form.append('bSkipReview', 'true');
  }
  if (allowDuplicate) {
    form.append('bAllowDuplicate', 'true');
  }
  const res = await axios.post<ImportResponse>(endpoints.recipes.importImage, form, {
    // The shared instance sends JSON, which would turn the form data into JSON too
    headers: { 'Content-Type': 'multipart/form-data' },
    signal,
  });
  return res.data.data;
};

// Pasted links, one per line, ready to import: trimmed, without blank lines or exact repeats.
// Lines that aren't web addresses are listed separately rather than sent
export const parseLinks = (text: string) => {
  const lines = Array.from(
    new Set(
      text
        .split(/\r?\n/)
        .map((line) => line.trim())
        .filter(Boolean)
    )
  );
  const urls: string[] = [];
  const invalid: string[] = [];
  lines.forEach((line) => {
    const url = toImportUrl(line);
    if (url) {
      urls.push(url);
    } else {
      invalid.push(line);
    }
  });
  // Adding https:// can make two different lines the same address
  return { urls: Array.from(new Set(urls)), invalid };
};

// A chosen photo. `combine` puts it in the same recipe as the photo before it, for a recipe
// across several pages
export type ChosenPhoto = { id: string; file: File; combine: boolean };

// The recipe each photo goes into, counting from 0, or null for photos the API would refuse,
// which are left out so they don't use a request
export const recipeNumbers = (photos: ChosenPhoto[]) => {
  let recipe = -1;
  let size = 0;
  return photos.map((photo) => {
    if (checkImage(photo.file)) {
      return null;
    }
    if (photo.combine && recipe >= 0 && size < MAX_IMAGES_PER_RECIPE) {
      size++;
    } else {
      recipe++;
      size = 1;
    }
    return recipe;
  });
};

// The photos of each recipe, in the order chosen
export const groupPhotos = (photos: ChosenPhoto[]): File[][] => {
  const groups: File[][] = [];
  recipeNumbers(photos).forEach((recipe, i) => {
    if (recipe !== null) {
      (groups[recipe] ??= []).push(photos[i].file);
    }
  });
  return groups;
};

// Whether the photo at `index` can join the recipe of the usable photo before it: there must be
// one, and that recipe must have room
export const canCombine = (photos: ChosenPhoto[], index: number) => {
  const numbers = recipeNumbers(photos.slice(0, index + 1));
  if (numbers[index] === null) {
    return false;
  }
  const previous = numbers
    .slice(0, index)
    .filter((recipe) => recipe !== null)
    .pop();
  if (previous === undefined) {
    return false;
  }
  // How many photos the previous recipe has, not counting this one
  const size = numbers.slice(0, index).filter((recipe) => recipe === previous).length;
  return size < MAX_IMAGES_PER_RECIPE;
};
