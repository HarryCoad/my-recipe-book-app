'use client';

import { ReactNode } from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { IconGripVertical } from '@tabler/icons-react';
import { ActionIcon } from '@mantine/core';

type SortableRowProps = {
  id: string;
  label: string;
  // Stops the row being dragged or dropped on, e.g. ingredients while a heading is dragged
  disabled?: boolean;
  // Renders the row, given its drag handle
  children: (handle: ReactNode) => ReactNode;
};

export function SortableRow({ id, label, disabled, children }: SortableRowProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    setActivatorNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id, disabled });

  const handle = (
    <ActionIcon
      ref={setActivatorNodeRef}
      variant="subtle"
      color="gray"
      size="lg"
      {...attributes}
      {...listeners}
      aria-label={`Drag ${label}`}
      // Tab skips the handle so it goes straight to the next field. Alt+arrow keys move rows
      tabIndex={-1}
      style={{ cursor: disabled ? undefined : 'grab', touchAction: 'none' }}
    >
      <IconGripVertical size={18} />
    </ActionIcon>
  );

  return (
    <div
      ref={setNodeRef}
      style={{
        transform: CSS.Translate.toString(transform),
        transition,
        // The DragOverlay shows the row being dragged, so this is left as a placeholder
        opacity: isDragging ? 0.4 : undefined,
      }}
    >
      {children(handle)}
    </div>
  );
}
