import { MAX_IMAGE_BYTES } from '@/helpers/imports';
import { prepareImage } from '@/helpers/prepareImage';

const photo = (name: string, type: string, size: number) => {
  const file = new File(['x'], name, { type });
  Object.defineProperty(file, 'size', { value: size });
  return file;
};

// jsdom can't draw images, so the browser's drawing is stood in for. `sizes` are what each
// attempt at saving the photo comes out as
const fakeDrawing = ({ width = 4000, height = 3000, sizes = [1_000_000] } = {}) => {
  const close = jest.fn();
  const drawImage = jest.fn();
  (window as any).createImageBitmap = jest.fn().mockResolvedValue({ width, height, close });
  jest
    .spyOn(HTMLCanvasElement.prototype, 'getContext')
    .mockReturnValue({ drawImage } as unknown as CanvasRenderingContext2D);
  const qualities: number[] = [];
  let attempt = 0;
  jest.spyOn(HTMLCanvasElement.prototype, 'toBlob').mockImplementation(function toBlob(
    this: HTMLCanvasElement,
    done,
    type,
    quality
  ) {
    qualities.push(quality as number);
    const blob = new Blob(['x'], { type });
    Object.defineProperty(blob, 'size', { value: sizes[Math.min(attempt++, sizes.length - 1)] });
    done(blob);
  });
  return { drawImage, qualities };
};

describe('prepareImage', () => {
  afterEach(() => {
    jest.restoreAllMocks();
    delete (window as any).createImageBitmap;
  });

  it('leaves photos that are small enough as they are', async () => {
    const small = photo('card.png', 'image/png', MAX_IMAGE_BYTES);
    await expect(prepareImage(small)).resolves.toBe(small);
  });

  it('shrinks a big phone photo to a JPEG that fits, keeping its shape', async () => {
    const { drawImage } = fakeDrawing({ width: 4032, height: 3024 });
    const big = photo('IMG_0042.jpeg', 'image/jpeg', 9 * 1024 * 1024);

    const prepared = await prepareImage(big);

    expect(prepared).not.toBe(big);
    expect(prepared.name).toBe('IMG_0042.jpg');
    expect(prepared.type).toBe('image/jpeg');
    // 2560 on the longest side, in proportion
    expect(drawImage).toHaveBeenCalledWith(expect.anything(), 0, 0, 2560, 1920);
    expect(createImageBitmap).toHaveBeenCalledWith(big, { imageOrientation: 'from-image' });
  });

  it('lowers the quality until it fits', async () => {
    const { qualities } = fakeDrawing({ sizes: [6_000_000, 4_000_000] });
    const prepared = await prepareImage(photo('a.jpg', 'image/jpeg', 8_000_000));

    expect(qualities).toEqual([0.85, 0.7]);
    expect(prepared.type).toBe('image/jpeg');
  });

  it('gives up and leaves it for the usual check when it still won’t fit', async () => {
    fakeDrawing({ sizes: [6_000_000] });
    const huge = photo('a.jpg', 'image/jpeg', 30_000_000);
    await expect(prepareImage(huge)).resolves.toBe(huge);
  });

  it('leaves alone what it can’t redraw', async () => {
    fakeDrawing();
    const gif = photo('a.gif', 'image/gif', 8_000_000);
    const heic = photo('a.heic', 'image/heic', 8_000_000);
    await expect(prepareImage(gif)).resolves.toBe(gif);
    await expect(prepareImage(heic)).resolves.toBe(heic);
    expect(createImageBitmap).not.toHaveBeenCalled();
  });

  it('leaves a photo the browser can’t read as it is', async () => {
    (window as any).createImageBitmap = jest.fn().mockRejectedValue(new Error('unreadable'));
    const broken = photo('a.jpg', 'image/jpeg', 8_000_000);
    await expect(prepareImage(broken)).resolves.toBe(broken);
  });
});
