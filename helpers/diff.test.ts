import { diffLines, hasChanges } from '@/helpers/diff';

const show = (before: string[], after: string[]) =>
  diffLines(before, after).map(({ type, text }) =>
    type === 'same' ? text : `${type === 'added' ? '+' : '-'}${text}`
  );

describe('diffLines', () => {
  it('keeps unchanged lines and marks the rest', () => {
    expect(show(['a', 'b', 'c'], ['a', 'x', 'c'])).toEqual(['a', '-b', '+x', 'c']);
  });

  it('handles lines added or removed at either end', () => {
    expect(show(['b'], ['a', 'b', 'c'])).toEqual(['+a', 'b', '+c']);
    expect(show(['a', 'b', 'c'], ['b'])).toEqual(['-a', 'b', '-c']);
    expect(show([], ['a'])).toEqual(['+a']);
  });

  it('shows a moved line as removed in one place and added in another', () => {
    expect(show(['a', 'b', 'c'], ['b', 'c', 'a'])).toEqual(['-a', 'b', 'c', '+a']);
  });

  it('knows when nothing changed', () => {
    expect(hasChanges(diffLines(['a', 'b'], ['a', 'b']))).toBe(false);
    expect(hasChanges(diffLines(['a'], ['b']))).toBe(true);
  });
});
