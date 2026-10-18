import { Badge } from '@mantine/core';
import { EditStatus } from '@/types/recipe';

const STATUSES: Record<EditStatus, { label: string; color: string }> = {
  pending: { label: 'Waiting for review', color: 'yellow' },
  accepted: { label: 'Accepted', color: 'green' },
  rejected: { label: 'Rejected', color: 'red' },
};

export function SuggestionStatusBadge({ status }: { status: EditStatus }) {
  const { label, color } = STATUSES[status];
  return (
    <Badge variant="light" color={color}>
      {label}
    </Badge>
  );
}
