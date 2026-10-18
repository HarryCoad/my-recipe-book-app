'use client';

import { Fragment, KeyboardEvent, useId, useState } from 'react';
import {
  closestCenter,
  DndContext,
  DragEndEvent,
  DragOverlay,
  PointerSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { IconFold, IconPlus, IconTrash } from '@tabler/icons-react';
import { useFormikContext } from 'formik';
import { ActionIcon, Button, Group, Paper, Stack, Text, Textarea, Tooltip } from '@mantine/core';
import { RecipeContentValues } from './recipeFormSchema';
import { arrayMove, mergeIntoPrevious, newStep, StepRow } from './rows';
import { SortableRow } from './SortableRow';
import { useFieldError, useRowList } from './useRowList';

type StepListProps = {
  // Offer to join each step onto the one before it, for imports that split steps too finely
  mergeable?: boolean;
};

export function StepList({ mergeable = false }: StepListProps) {
  const { getFieldProps } = useFormikContext<RecipeContentValues>();
  const errorFor = useFieldError();
  const { rows, listRef, insertAt, removeAt, reorder, replaceRows } = useRowList<StepRow>('steps');

  // The cursor goes where the two steps join
  const merge = (index: number) => {
    const { steps, caret } = mergeIntoPrevious(rows, index);
    replaceRows(steps, { key: rows[index - 1].key, field: 'text', caret });
  };

  const dndId = useId();
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 4 } }));
  const [activeKey, setActiveKey] = useState<string | null>(null);
  const activeIndex = rows.findIndex((step) => step.key === activeKey);

  const handleDragEnd = ({ active, over }: DragEndEvent) => {
    setActiveKey(null);
    if (over && active.id !== over.id) {
      const from = rows.findIndex((step) => step.key === active.id);
      const to = rows.findIndex((step) => step.key === over.id);
      reorder(arrayMove(rows, from, to));
    }
  };

  const handleKeyDown = (step: StepRow, index: number) => (event: KeyboardEvent<HTMLElement>) => {
    const focus = { key: step.key, field: 'text' };

    if (event.altKey && (event.key === 'ArrowUp' || event.key === 'ArrowDown')) {
      event.preventDefault();
      const to = index + (event.key === 'ArrowUp' ? -1 : 1);
      if (to >= 0 && to < rows.length) {
        reorder(arrayMove(rows, index, to), focus);
      }
      return;
    }

    // Tab from the last step starts a new one, unless it's empty, so Tab can still leave the list.
    // Enter is left alone because steps can have several lines.
    if (event.key === 'Tab' && !event.shiftKey && index === rows.length - 1 && step.text.trim()) {
      event.preventDefault();
      const added = newStep();
      insertAt(index + 1, [added], { key: added.key, field: 'text' });
      return;
    }

    if (event.key === 'Backspace' && step.text === '' && rows.length > 1) {
      event.preventDefault();
      const neighbour = rows[index - 1] ?? rows[index + 1];
      removeAt(index, { key: neighbour.key, field: 'text' });
      return;
    }

    // Backspace at the very start of a step joins it onto the one before, as in a text editor.
    // The keyboard's way to merge, since Tab skips the merge buttons
    const { selectionStart, selectionEnd } = event.currentTarget as HTMLTextAreaElement;
    if (
      mergeable &&
      event.key === 'Backspace' &&
      index > 0 &&
      selectionStart === 0 &&
      selectionEnd === 0
    ) {
      event.preventDefault();
      merge(index);
    }
  };

  return (
    <Stack ref={listRef}>
      <DndContext
        id={dndId}
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragStart={({ active }) => setActiveKey(String(active.id))}
        onDragEnd={handleDragEnd}
        onDragCancel={() => setActiveKey(null)}
      >
        <SortableContext
          items={rows.map((step) => step.key)}
          strategy={verticalListSortingStrategy}
        >
          <Stack gap="xs">
            {rows.map((step, index) => {
              const label = `Step ${index + 1}`;
              return (
                <Fragment key={step.key}>
                  {/* Hidden while dragging, so only the steps move */}
                  {mergeable && index > 0 && activeKey === null && (
                    <Group justify="center" my={-6}>
                      <Tooltip label={`Join onto step ${index}`}>
                        <ActionIcon
                          variant="subtle"
                          color="gray"
                          size="sm"
                          // Like the delete buttons, Tab skips it. Backspace at the start of a
                          // step does the same from the keyboard
                          tabIndex={-1}
                          aria-label={`Merge step ${index + 1} into step ${index}`}
                          onClick={() => merge(index)}
                        >
                          <IconFold size={30} />
                        </ActionIcon>
                      </Tooltip>
                    </Group>
                  )}
                  <SortableRow id={step.key} label={label.toLowerCase()}>
                    {(handle) => (
                      <Group align="flex-start" wrap="nowrap" gap="xs">
                        <Stack gap={0} mt={24}>
                          {handle}
                        </Stack>
                        <Textarea
                          label={label}
                          autosize
                          minRows={2}
                          style={{ flexGrow: 1 }}
                          data-row-key={step.key}
                          data-field="text"
                          error={errorFor(`steps[${index}].text`)}
                          {...getFieldProps(`steps[${index}].text`)}
                          onKeyDown={handleKeyDown(step, index)}
                        />
                        <ActionIcon
                          variant="subtle"
                          color="red"
                          size="lg"
                          mt={24}
                          tabIndex={-1}
                          aria-label={`Remove ${label.toLowerCase()}`}
                          disabled={rows.length === 1}
                          onClick={() => removeAt(index)}
                        >
                          <IconTrash size={18} />
                        </ActionIcon>
                      </Group>
                    )}
                  </SortableRow>
                </Fragment>
              );
            })}
          </Stack>
        </SortableContext>

        <DragOverlay>
          {activeIndex !== -1 && (
            <Paper shadow="md" px="md" py="xs" withBorder maw={500}>
              <Text lineClamp={2}>
                <strong>Step {activeIndex + 1}:</strong> {rows[activeIndex].text || 'Empty step'}
              </Text>
            </Paper>
          )}
        </DragOverlay>
      </DndContext>

      {typeof errorFor('steps') === 'string' && (
        <Text c="red" size="sm">
          {errorFor('steps')}
        </Text>
      )}

      <Button
        variant="light"
        color="orange"
        leftSection={<IconPlus size={16} />}
        style={{ alignSelf: 'flex-start' }}
        onClick={() => {
          const added = newStep();
          insertAt(rows.length, [added], { key: added.key, field: 'text' });
        }}
      >
        Add step
      </Button>
    </Stack>
  );
}
