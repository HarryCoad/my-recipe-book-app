import { useRef } from 'react';
import { FormikTouched, getIn, useFormikContext } from 'formik';
import { flushSync } from 'react-dom';
import { RecipeContentValues } from './recipeFormSchema';

type ListName = 'ingredients' | 'steps';
// `caret` is where the cursor goes, at the end by default
type FocusTarget = { key: string; field: string; caret?: number };

// Shows a field's error once it has been touched (Formik touches every field on submit)
export const useFieldError = () => {
  const { errors, touched } = useFormikContext<RecipeContentValues>();
  return (name: string): string | undefined =>
    getIn(touched, name) ? getIn(errors, name) : undefined;
};

/**
 * Edits one of the form's row lists. Rows are matched by key, so `touched` moves with its row when
 * rows are inserted, removed or reordered. Inputs mark themselves with `data-row-key` and
 * `data-field`, so focus can move to a row as soon as it exists.
 */
export function useRowList<Row extends { key: string }>(name: ListName) {
  const { values, touched, setFieldValue, setTouched } = useFormikContext<RecipeContentValues>();
  const rows = values[name] as unknown as Row[];
  const listTouched = touched[name] as unknown[] | undefined;
  const listRef = useRef<HTMLDivElement>(null);

  // Commits the change straight away, so a new row's input exists to focus in the same event
  const setRows = (next: Row[], nextTouched: unknown[] | undefined, focus?: FocusTarget) => {
    flushSync(() => {
      setFieldValue(name, next);
      if (Array.isArray(listTouched)) {
        setTouched(
          { ...touched, [name]: nextTouched } as FormikTouched<RecipeContentValues>,
          false
        );
      }
    });
    if (focus) {
      const element = listRef.current?.querySelector<HTMLInputElement>(
        `[data-row-key="${focus.key}"][data-field="${focus.field}"]`
      );
      element?.focus();
      // Put the cursor at the end, e.g. after Backspace removes the row below
      const caret = focus.caret ?? element?.value.length ?? 0;
      element?.setSelectionRange?.(caret, caret);
    }
  };

  const insertAt = (index: number, newRows: Row[], focus?: FocusTarget) => {
    const next = [...rows];
    next.splice(index, 0, ...newRows);
    const nextTouched = listTouched && [...listTouched];
    nextTouched?.splice(index, 0, ...newRows.map(() => undefined));
    setRows(next, nextTouched, focus);
  };

  const removeAt = (index: number, focus?: FocusTarget) => {
    setRows(
      rows.filter((_, i) => i !== index),
      listTouched?.filter((_, i) => i !== index),
      focus
    );
  };

  // `next` holds some of the current rows, matched by key: reordered, changed or fewer of them
  const replaceRows = (next: Row[], focus?: FocusTarget) => {
    const oldIndex = new Map(rows.map((row, i) => [row.key, i]));
    setRows(
      next,
      next.map((row) => listTouched?.[oldIndex.get(row.key)!]),
      focus
    );
  };

  // `next` holds the same rows in a new order
  const reorder = replaceRows;

  return { rows, listRef, insertAt, removeAt, reorder, replaceRows };
}
