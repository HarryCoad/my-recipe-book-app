import { MAX_IMAGE_BYTES } from '@/helpers/imports';

// Phone cameras often take photos over the API's 5 MB limit. Those are made smaller in the browser
// before uploading: scaled down to this size on their longest side, which keeps text on a recipe
// card readable, and saved as JPEG
const MAX_DIMENSION = 2560;
// Tried in turn until the photo fits
const QUALITIES = [0.85, 0.7, 0.55];
// Types the browser can redraw. GIFs are left alone, since redrawing would lose any animation
const SHRINKABLE = ['image/jpeg', 'image/png', 'image/webp'];

const toBlob = (canvas: HTMLCanvasElement, quality: number) =>
  new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/jpeg', quality));

// The photo, made small enough to upload if it was too big. Anything that can't be shrunk, or is
// still too big, comes back as it was, so the usual check explains the problem
export const prepareImage = async (file: File): Promise<File> => {
  if (file.size <= MAX_IMAGE_BYTES || !SHRINKABLE.includes(file.type)) {
    return file;
  }
  try {
    // Follows the photo's own rotation, so phone photos aren't turned sideways
    const bitmap = await createImageBitmap(file, { imageOrientation: 'from-image' });
    const scale = Math.min(1, MAX_DIMENSION / Math.max(bitmap.width, bitmap.height));
    const canvas = document.createElement('canvas');
    canvas.width = Math.round(bitmap.width * scale);
    canvas.height = Math.round(bitmap.height * scale);
    canvas.getContext('2d')?.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    bitmap.close();

    for (const quality of QUALITIES) {
      const blob = await toBlob(canvas, quality);
      if (blob && blob.size <= MAX_IMAGE_BYTES) {
        const name = file.name.replace(/\.[^.]*$/, '') || 'photo';
        return new File([blob], `${name}.jpg`, {
          type: 'image/jpeg',
          lastModified: file.lastModified,
        });
      }
    }
  } catch {
    // An image the browser can't read: the API's own check will say so
  }
  return file;
};

export const prepareImages = (files: File[]) => Promise.all(files.map(prepareImage));
