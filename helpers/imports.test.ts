import axios from '@/helpers/axios';
import {
  canCombine,
  checkImage,
  ChosenPhoto,
  groupPhotos,
  parseLinks,
  recipeNumbers,
  sendImport,
  toImportUrl,
} from '@/helpers/imports';

jest.mock('@/helpers/axios', () => ({
  __esModule: true,
  ...jest.requireActual('@/helpers/axios'),
  default: { post: jest.fn() },
}));
const post = axios.post as jest.Mock;

const photo = (name: string, { type = 'image/jpeg', size = 1000 } = {}) => {
  const file = new File(['x'], name, { type });
  Object.defineProperty(file, 'size', { value: size });
  return file;
};
const chosen = (name: string, combine = false, options = {}): ChosenPhoto => ({
  id: name,
  file: photo(name, options),
  combine,
});
const names = (groups: File[][]) => groups.map((group) => group.map((file) => file.name));

describe('sendImport', () => {
  const result = { draft: null, issues: [], recipe: null, duplicateOf: null };
  beforeEach(() => {
    jest.clearAllMocks();
    post.mockResolvedValue({ data: { status: 1, data: result } });
  });

  it('sends a link as JSON, with only the flags asked for', async () => {
    await expect(sendImport({ kind: 'url', url: 'https://a.com/x' })).resolves.toEqual(result);
    expect(post).toHaveBeenCalledWith(
      '/api/v1/recipes/import-url',
      { url: 'https://a.com/x' },
      { signal: undefined }
    );

    await sendImport(
      { kind: 'url', url: 'https://a.com/x' },
      { skipReview: true, allowDuplicate: true }
    );
    expect(post).toHaveBeenLastCalledWith(
      '/api/v1/recipes/import-url',
      { url: 'https://a.com/x', bSkipReview: true, bAllowDuplicate: true },
      { signal: undefined }
    );
  });

  it('sends the photos of one recipe together, in order, with the flags as text', async () => {
    const pages = [photo('page1.jpg'), photo('page2.jpg')];
    await sendImport({ kind: 'image', files: pages }, { skipReview: true, allowDuplicate: true });

    const [url, form, config] = post.mock.calls[0];
    expect(url).toBe('/api/v1/recipes/import-image');
    expect((form as FormData).getAll('image')).toEqual(pages);
    expect((form as FormData).get('bSkipReview')).toBe('true');
    expect((form as FormData).get('bAllowDuplicate')).toBe('true');
    expect(config.headers).toEqual({ 'Content-Type': 'multipart/form-data' });
  });

  it('leaves the flags out of a photo import unless asked', async () => {
    await sendImport({ kind: 'image', files: [photo('a.jpg')] });
    const form = post.mock.calls[0][1] as FormData;
    expect(form.has('bSkipReview')).toBe(false);
    expect(form.has('bAllowDuplicate')).toBe(false);
  });
});

describe('parseLinks', () => {
  it('trims lines, drops blanks and repeats, and sets aside what isn’t a web address', () => {
    expect(
      parseLinks(
        ' https://a.com/soup \n\n https://a.com/soup\r\nb.com/pie\nnot a link\n   \nhttps://b.com/pie'
      )
    ).toEqual({
      urls: ['https://a.com/soup', 'https://b.com/pie'],
      invalid: ['not a link'],
    });
  });
});

describe('toImportUrl', () => {
  it.each([
    ['https://example.com/a', 'https://example.com/a'],
    [' example.com/a ', 'https://example.com/a'],
    ['http://example.com', 'http://example.com/'],
    ['', null],
    ['not a url', null],
    ['ftp://example.com/a', null],
    ['localhost', null],
  ])('%p becomes %p', (text, url) => {
    expect(toImportUrl(text)).toBe(url);
  });
});

describe('checkImage', () => {
  it('accepts the formats the API reads, up to 5 MB', () => {
    expect(checkImage(photo('a.png', { type: 'image/png', size: 5 * 1024 * 1024 }))).toBeNull();
    expect(checkImage(photo('a.heic', { type: 'image/heic' }))).toMatch(/JPEG, PNG, GIF or WebP/);
    expect(checkImage(photo('a.webp', { type: 'image/webp', size: 5 * 1024 * 1024 + 1 }))).toMatch(
      /too big/
    );
  });
});

describe('grouping photos into recipes', () => {
  it('makes each photo its own recipe unless combined with the one before', () => {
    expect(
      names(groupPhotos([chosen('a'), chosen('b', true), chosen('c'), chosen('d', true)]))
    ).toEqual([
      ['a', 'b'],
      ['c', 'd'],
    ]);
  });

  it('keeps photos in the order chosen', () => {
    expect(names(groupPhotos([chosen('z'), chosen('a'), chosen('m')]))).toEqual([
      ['z'],
      ['a'],
      ['m'],
    ]);
  });

  it('leaves out photos the API would refuse', () => {
    const tooBig = { size: 6 * 1024 * 1024 };
    expect(
      names(groupPhotos([chosen('a'), chosen('big', true, tooBig), chosen('b', true)]))
    ).toEqual([['a', 'b']]);
  });

  it('puts at most 4 photos in one recipe', () => {
    const photos = ['a', 'b', 'c', 'd', 'e'].map((name, i) => chosen(name, i > 0));
    expect(names(groupPhotos(photos))).toEqual([['a', 'b', 'c', 'd'], ['e']]);
    expect(canCombine(photos, 3)).toBe(true);
    expect(canCombine(photos, 4)).toBe(false);
  });

  it('numbers the recipe each photo goes into, for showing the groups', () => {
    const heic = { type: 'image/heic' };
    expect(
      recipeNumbers([chosen('a'), chosen('b', true), chosen('bad', false, heic), chosen('c')])
    ).toEqual([0, 0, null, 1]);
  });

  it("can't combine the first photo, or one the API would refuse", () => {
    const photos = [chosen('a'), chosen('heic', false, { type: 'image/heic' })];
    expect(canCombine(photos, 0)).toBe(false);
    expect(canCombine(photos, 1)).toBe(false);
  });
});
