import { AxiosError, AxiosHeaders, AxiosResponse } from 'axios';
import { ImportQueue, MAX_RUNNING, progress, SendImport } from '@/helpers/importQueue';
import { ImportJob } from '@/helpers/imports';
import { ImportDraft, ImportResult, Recipe } from '@/types/recipe';

// Each import waits until the test answers it, so the test controls what's running
type Call = {
  job: ImportJob;
  allowDuplicate?: boolean;
  resolve: (result: ImportResult) => void;
  reject: (err: unknown) => void;
};

const setUp = () => {
  const calls: Call[] = [];
  const send: SendImport = (job, options) =>
    new Promise((resolve, reject) =>
      calls.push({ job, allowDuplicate: options.allowDuplicate, resolve, reject })
    );
  const queue = new ImportQueue(send);
  const statuses = () => queue.getState().items.map((item) => item.status);
  return { calls, queue, statuses };
};

const links = (count: number): ImportJob[] =>
  Array.from({ length: count }, (_, i) => ({ kind: 'url', url: `https://a.com/${i}` }));

// Lets the queue react to an answer before checking
const settle = () => new Promise((resolve) => setTimeout(resolve, 0));

const nothing: ImportResult = { draft: null, issues: [], recipe: null, duplicateOf: null };
const added = (id: string): ImportResult => ({
  ...nothing,
  recipe: { id, title: `Recipe ${id}` } as Recipe,
  draft: { title: `Recipe ${id}` } as ImportDraft,
});

const apiError = (status: number, message: string) =>
  new AxiosError('Request failed', 'ERR_BAD_RESPONSE', undefined, undefined, {
    status,
    data: { status: 0, message },
    statusText: '',
    headers: {},
    config: { headers: new AxiosHeaders() },
  } as AxiosResponse);
const networkError = () => new AxiosError('Network Error', 'ERR_NETWORK');

describe('Import queue', () => {
  it(`runs at most ${MAX_RUNNING} imports at once, in order, always skipping review`, async () => {
    const { calls, queue, statuses } = setUp();
    queue.add(links(5));

    expect(calls).toHaveLength(3);
    expect(statuses()).toEqual(['importing', 'importing', 'importing', 'queued', 'queued']);

    calls[1].resolve(added('r1'));
    await settle();

    // The next in line takes its place
    expect(calls).toHaveLength(4);
    expect(calls[3].job).toEqual({ kind: 'url', url: 'https://a.com/3' });
    expect(statuses()).toEqual(['importing', 'added', 'importing', 'importing', 'queued']);
  });

  it('records what happened to each recipe', async () => {
    const { calls, queue } = setUp();
    queue.add(links(3));
    const draft = { title: 'Soup' } as ImportDraft;
    const issues = [{ fieldname: 'cookTime', code: 'too_small' }];

    calls[0].resolve(added('r1'));
    calls[1].resolve({ ...nothing, duplicateOf: { id: 'old', title: 'Pie' } });
    calls[2].resolve({ ...nothing, draft, issues });
    await settle();

    const [first, second, third] = queue.getState().items;
    expect(first).toMatchObject({ status: 'added', recipe: { id: 'r1', title: 'Recipe r1' } });
    expect(second).toMatchObject({ status: 'duplicate', duplicateOf: { id: 'old', title: 'Pie' } });
    expect(third).toMatchObject({ status: 'review', draft, issues });
  });

  it.each([
    ['reading the recipe failed', () => apiError(502, 'IMPORT_FAILED')],
    ['the request got no answer', networkError],
  ])('tries again once by itself when %s, then waits for the user', async (_, error) => {
    const { calls, queue, statuses } = setUp();
    queue.add(links(1));

    calls[0].reject(error());
    await settle();
    expect(calls).toHaveLength(2);
    expect(statuses()).toEqual(['importing']);

    calls[1].reject(error());
    await settle();
    expect(calls).toHaveLength(2);
    expect(statuses()).toEqual(['failed']);
    expect(queue.getState().items[0].error).toBeTruthy();

    // A manual retry gets its own automatic retry too
    queue.retry(queue.getState().items[0].id);
    expect(calls).toHaveLength(3);
    calls[2].reject(error());
    await settle();
    expect(calls).toHaveLength(4);
  });

  it.each([
    ['NO_RECIPE_FOUND', 422, "We couldn't find a recipe there."],
    ['FETCH_FAILED', 502, "We couldn't load that page."],
    ['URL_NOT_ALLOWED', 400, 'public websites'],
    ['INVALID_URL', 400, "doesn't look like a web address"],
    ['INVALID_IMAGE', 400, 'JPEG, PNG, GIF or WebP'],
    ['IMAGE_TOO_LARGE', 413, 'too big'],
    ['TOO_MANY_IMAGES', 400, 'up to 4 photos'],
  ])('fails straight away on %s, saying why', async (code, status, message) => {
    const { calls, queue, statuses } = setUp();
    queue.add(links(1));

    calls[0].reject(apiError(status, code));
    await settle();

    expect(calls).toHaveLength(1);
    expect(statuses()).toEqual(['failed']);
    expect(queue.getState().items[0].error).toContain(message);
  });

  it('pauses at the hourly limit without failing anything, and carries on when resumed', async () => {
    const { calls, queue, statuses } = setUp();
    queue.add(links(5));

    calls[0].reject(apiError(429, 'TOO_MANY_IMPORTS'));
    await settle();

    expect(queue.getState().paused).toBe(true);
    // Back in the queue, and nothing new started
    expect(statuses()).toEqual(['queued', 'importing', 'importing', 'queued', 'queued']);
    expect(calls).toHaveLength(3);

    // Imports already sent still finish, but don't start more
    calls[1].resolve(added('r1'));
    await settle();
    expect(calls).toHaveLength(3);
    expect(statuses()).not.toContain('failed');

    queue.resume();
    expect(queue.getState().paused).toBe(false);
    // The paused recipe goes first
    expect(calls).toHaveLength(5);
    expect(calls[3].job).toEqual({ kind: 'url', url: 'https://a.com/0' });
  });

  it('imports a duplicate anyway when asked', async () => {
    const { calls, queue, statuses } = setUp();
    queue.add(links(1));
    calls[0].resolve({ ...nothing, duplicateOf: { id: 'old', title: 'Pie' } });
    await settle();

    queue.importAnyway(queue.getState().items[0].id);

    expect(calls).toHaveLength(2);
    expect(calls[1].allowDuplicate).toBe(true);
    calls[1].resolve(added('r2'));
    await settle();
    expect(statuses()).toEqual(['added']);
  });

  it('cancels what has not started, letting imports already sent finish', async () => {
    const { calls, queue, statuses } = setUp();
    queue.add(links(5));

    queue.cancelRest();
    expect(statuses()).toEqual(['importing', 'importing', 'importing', 'cancelled', 'cancelled']);

    calls[0].resolve(added('r1'));
    await settle();
    expect(calls).toHaveLength(3);
    expect(statuses()[0]).toBe('added');
  });

  it('tracks drafts saved or dismissed after review', async () => {
    const { calls, queue } = setUp();
    queue.add(links(2));
    const draft = { title: 'Soup' } as ImportDraft;
    calls[0].resolve({ ...nothing, draft });
    calls[1].resolve({ ...nothing, draft });
    await settle();
    const [first, second] = queue.getState().items;

    queue.markAdded(first.id, { id: 'r9', title: 'Soup' });
    queue.dismiss(second.id);

    expect(queue.getState().items.map((item) => item.status)).toEqual(['added', 'dismissed']);
    expect(queue.getState().items[0].recipe).toEqual({ id: 'r9', title: 'Soup' });
  });

  it('counts progress as everything that has finished, whatever the outcome', async () => {
    const { calls, queue } = setUp();
    queue.add(links(4));
    calls[0].resolve(added('r1'));
    calls[1].reject(apiError(422, 'NO_RECIPE_FOUND'));
    await settle();

    expect(progress(queue.getState().items)).toEqual({ done: 2, total: 4 });
  });

  it('tells listeners about every change', async () => {
    const { calls, queue } = setUp();
    const listener = jest.fn();
    const unsubscribe = queue.subscribe(listener);

    queue.add(links(1));
    const before = listener.mock.calls.length;
    calls[0].resolve(added('r1'));
    await settle();
    expect(listener.mock.calls.length).toBeGreaterThan(before);

    unsubscribe();
    const afterUnsubscribing = listener.mock.calls.length;
    queue.add(links(1));
    expect(listener.mock.calls.length).toBe(afterUnsubscribing);
  });
});
