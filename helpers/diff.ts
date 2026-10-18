export type DiffLine = { type: 'same' | 'added' | 'removed'; text: string };

// A line-by-line diff from `before` to `after`, keeping as many lines in place as possible (the
// longest common subsequence). Where lines change, the removed ones come before the added ones.
export const diffLines = (before: string[], after: string[]): DiffLine[] => {
  // common[i][j] is how many lines before[i..] and after[j..] have in common
  const common = Array.from({ length: before.length + 1 }, () =>
    new Array<number>(after.length + 1).fill(0)
  );
  for (let i = before.length - 1; i >= 0; i--) {
    for (let j = after.length - 1; j >= 0; j--) {
      common[i][j] =
        before[i] === after[j]
          ? common[i + 1][j + 1] + 1
          : Math.max(common[i + 1][j], common[i][j + 1]);
    }
  }

  const lines: DiffLine[] = [];
  let i = 0;
  let j = 0;
  while (i < before.length || j < after.length) {
    if (i < before.length && j < after.length && before[i] === after[j]) {
      lines.push({ type: 'same', text: before[i] });
      i++;
      j++;
    } else if (j >= after.length || (i < before.length && common[i + 1][j] >= common[i][j + 1])) {
      lines.push({ type: 'removed', text: before[i] });
      i++;
    } else {
      lines.push({ type: 'added', text: after[j] });
      j++;
    }
  }
  return lines;
};

export const hasChanges = (lines: DiffLine[]) => lines.some((line) => line.type !== 'same');
