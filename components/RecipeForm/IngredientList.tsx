'use client';

import { KeyboardEvent, useId, useState } from 'react';
import {
  closestCenter,
  DndContext,
  DragEndEvent,
  DragOverlay,
  MeasuringStrategy,
  PointerSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { IconHeading, IconPlus, IconTrash } from '@tabler/icons-react';
import { useFormikContext } from 'formik';
import {
  ActionIcon,
  Badge,
  Button,
  Group,
  NumberInput,
  Paper,
  Stack,
  Text,
  TextInput,
} from '@mantine/core';
import { RecipeFormValues } from './recipeFormSchema';
import {
  arrayMove,
  groupMemberKeys,
  IngredientListRow,
  isEmptyRow,
  leadLength,
  moveGroup,
  moveRowBy,
  newHeading,
  newIngredient,
} from './rows';
import { SortableRow } from './SortableRow';
import { UnitSelect } from './UnitSelect';
import { useFieldError, useRowList } from './useRowList';

type Field = 'quantity' | 'unit' | 'name' | 'text';

// The first and last field the keyboard reaches in a row
const firstField = (row: IngredientListRow): Field =>
  row.kind === 'heading' ? 'text' : 'quantity';
const lastField = (row: IngredientListRow): Field => (row.kind === 'heading' ? 'text' : 'name');

const describe = (row: IngredientListRow) =>
  row.kind === 'heading'
    ? row.text || 'Heading'
    : [row.quantity, row.unit, row.name].filter((part) => part !== '' && part !== null).join(' ') ||
      'Ingredient';

export function IngredientList() {
  const { setFieldValue, getFieldProps } = useFormikContext<RecipeFormValues>();
  const errorFor = useFieldError();
  const { rows, listRef, insertAt, removeAt, reorder } =
    useRowList<IngredientListRow>('ingredients');

  const dndId = useId();
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 4 } }));
  const [activeKey, setActiveKey] = useState<string | null>(null);
  const activeRow = rows.find((row) => row.key === activeKey) ?? null;

  // While a heading is dragged, every group collapses to its heading, so groups move as whole
  // blocks. The ingredients before the first heading stay put.
  const draggingGroup = activeRow?.kind === 'heading';
  const lead = leadLength(rows);
  const ingredientCount = rows.filter((row) => row.kind === 'ingredient').length;

  const handleDragEnd = ({ active, over }: DragEndEvent) => {
    setActiveKey(null);
    if (!over || active.id === over.id) {
      return;
    }
    if (draggingGroup) {
      reorder(moveGroup(rows, String(active.id), String(over.id)));
    } else {
      const from = rows.findIndex((row) => row.key === active.id);
      const to = rows.findIndex((row) => row.key === over.id);
      reorder(arrayMove(rows, from, to));
    }
  };

  const handleKeyDown =
    (row: IngredientListRow, index: number, field: Field) =>
    (event: KeyboardEvent<HTMLElement>) => {
      const typed = (event.currentTarget as HTMLInputElement).value;

      // Alt+↑/↓ moves the row (a heading takes its group with it), keeping the cursor in place
      if (event.altKey && (event.key === 'ArrowUp' || event.key === 'ArrowDown')) {
        event.preventDefault();
        reorder(moveRowBy(rows, row.key, event.key === 'ArrowUp' ? -1 : 1), {
          key: row.key,
          field,
        });
        return;
      }

      // Tab from the end of the last row, or Enter at the end of any row, starts a new ingredient
      // below it. An empty row doesn't, so Tab can still leave the list.
      const addsRow =
        field === lastField(row) &&
        !isEmptyRow(row) &&
        ((event.key === 'Tab' && !event.shiftKey && index === rows.length - 1) ||
          event.key === 'Enter');
      if (addsRow) {
        event.preventDefault();
        const added = newIngredient();
        insertAt(index + 1, [added], { key: added.key, field: 'quantity' });
        return;
      }
      if (event.key === 'Enter' && field !== 'unit') {
        // Enter would otherwise submit the whole form
        event.preventDefault();
        return;
      }

      // Backspace in an empty row removes it, keeping at least one ingredient
      const isOnlyIngredient = row.kind === 'ingredient' && ingredientCount === 1;
      if (event.key === 'Backspace' && typed === '' && isEmptyRow(row) && !isOnlyIngredient) {
        event.preventDefault();
        const previous = rows[index - 1];
        const next = rows[index + 1];
        removeAt(
          index,
          previous
            ? { key: previous.key, field: lastField(previous) }
            : next && { key: next.key, field: firstField(next) }
        );
      }
    };

  let ingredientNumber = 0;
  let headingNumber = 0;

  return (
    <Stack ref={listRef}>
      <DndContext
        id={dndId}
        sensors={sensors}
        collisionDetection={closestCenter}
        // Rows appear and disappear as groups collapse, so keep measuring while dragging
        measuring={{ droppable: { strategy: MeasuringStrategy.Always } }}
        onDragStart={({ active }) => setActiveKey(String(active.id))}
        onDragEnd={handleDragEnd}
        onDragCancel={() => setActiveKey(null)}
      >
        <SortableContext
          items={
            draggingGroup
              ? rows.filter((row) => row.kind === 'heading').map((row) => row.key)
              : rows.map((row) => row.key)
          }
          strategy={verticalListSortingStrategy}
        >
          <Stack gap="xs">
            {rows.map((row, index) => {
              if (row.kind === 'heading') {
                headingNumber++;
                const label = `Heading ${headingNumber}`;
                return (
                  <SortableRow key={row.key} id={row.key} label={label}>
                    {(handle) => (
                      <Group align="flex-start" wrap="nowrap" gap="xs" mt={index > 0 ? 'sm' : 0}>
                        {handle}
                        <TextInput
                          aria-label={label}
                          placeholder="Heading, e.g. For the sauce"
                          style={{ flexGrow: 1 }}
                          styles={{ input: { fontWeight: 700 } }}
                          data-row-key={row.key}
                          data-field="text"
                          error={errorFor(`ingredients[${index}].text`)}
                          {...getFieldProps(`ingredients[${index}].text`)}
                          onKeyDown={handleKeyDown(row, index, 'text')}
                        />
                        {draggingGroup && (
                          <Badge variant="light" color="gray" mt={8}>
                            {groupMemberKeys(rows, row.key).length} ingredients
                          </Badge>
                        )}
                        <ActionIcon
                          variant="subtle"
                          color="red"
                          size="lg"
                          tabIndex={-1}
                          aria-label={`Remove ${label.toLowerCase()} (keeps its ingredients)`}
                          title="Remove heading (keeps its ingredients)"
                          onClick={() => removeAt(index)}
                        >
                          <IconTrash size={18} />
                        </ActionIcon>
                      </Group>
                    )}
                  </SortableRow>
                );
              }

              ingredientNumber++;
              // Collapsed into its heading while a group is being dragged
              if (draggingGroup && index >= lead) {
                return null;
              }
              const label = `Ingredient ${ingredientNumber}`;
              const path = `ingredients[${index}]`;
              return (
                <SortableRow key={row.key} id={row.key} label={label} disabled={draggingGroup}>
                  {(handle) => (
                    // Indented under its heading, if it has one
                    <Group align="flex-start" wrap="nowrap" gap="xs" pl={index > lead ? 'lg' : 0}>
                      {handle}
                      <NumberInput
                        aria-label={`${label} quantity`}
                        placeholder="Qty"
                        w={90}
                        min={0}
                        hideControls
                        data-row-key={row.key}
                        data-field="quantity"
                        value={row.quantity}
                        onChange={(value) => setFieldValue(`${path}.quantity`, value)}
                        onBlur={getFieldProps(`${path}.quantity`).onBlur}
                        onKeyDown={handleKeyDown(row, index, 'quantity')}
                        name={`${path}.quantity`}
                        error={errorFor(`${path}.quantity`)}
                      />
                      <UnitSelect
                        aria-label={`${label} unit`}
                        placeholder="Unit"
                        w={110}
                        data-row-key={row.key}
                        data-field="unit"
                        value={row.unit}
                        onChange={(value) => setFieldValue(`${path}.unit`, value)}
                        onBlur={getFieldProps(`${path}.unit`).onBlur}
                        onKeyDown={handleKeyDown(row, index, 'unit')}
                        name={`${path}.unit`}
                        error={errorFor(`${path}.unit`)}
                      />
                      <TextInput
                        aria-label={label}
                        placeholder="Ingredient, e.g. chickpeas"
                        style={{ flexGrow: 1 }}
                        data-row-key={row.key}
                        data-field="name"
                        error={errorFor(`${path}.name`)}
                        {...getFieldProps(`${path}.name`)}
                        onKeyDown={handleKeyDown(row, index, 'name')}
                      />
                      <ActionIcon
                        variant="subtle"
                        color="red"
                        size="lg"
                        tabIndex={-1}
                        aria-label={`Remove ${label.toLowerCase()}`}
                        disabled={ingredientCount === 1}
                        onClick={() => removeAt(index)}
                      >
                        <IconTrash size={18} />
                      </ActionIcon>
                    </Group>
                  )}
                </SortableRow>
              );
            })}
          </Stack>
        </SortableContext>

        <DragOverlay>
          {activeRow && (
            <Paper shadow="md" px="md" py="xs" withBorder>
              <Text fw={activeRow.kind === 'heading' ? 700 : undefined}>
                {describe(activeRow)}
                {activeRow.kind === 'heading' &&
                  ` · ${groupMemberKeys(rows, activeRow.key).length} ingredients`}
              </Text>
            </Paper>
          )}
        </DragOverlay>
      </DndContext>

      {typeof errorFor('ingredients') === 'string' && (
        <Text c="red" size="sm">
          {errorFor('ingredients')}
        </Text>
      )}

      <Group gap="xs">
        <Button
          variant="light"
          color="orange"
          leftSection={<IconPlus size={16} />}
          onClick={() => {
            const added = newIngredient();
            insertAt(rows.length, [added], { key: added.key, field: 'quantity' });
          }}
        >
          Add ingredient
        </Button>
        <Button
          variant="subtle"
          color="orange"
          leftSection={<IconHeading size={16} />}
          onClick={() => {
            const heading = newHeading();
            insertAt(rows.length, [heading, newIngredient()], { key: heading.key, field: 'text' });
          }}
        >
          Add heading
        </Button>
      </Group>
      <Text size="xs" c="dimmed">
        Tab or Enter at the end of a row adds another. Backspace in an empty row removes it, and
        Alt+↑/↓ moves the current row.
      </Text>
    </Stack>
  );
}
