'use client';

import {
  IconAlertCircle,
  IconCheck,
  IconCircleDashed,
  IconCopy,
  IconEdit,
  IconMinus,
  IconX,
} from '@tabler/icons-react';
import { Anchor, Button, Group, Loader, Stack, Text, ThemeIcon } from '@mantine/core';
import { recipePath } from '@/helpers/constants';
import { ImportQueue, ItemStatus, QueueItem } from '@/helpers/importQueue';
import { ImportJob } from '@/helpers/imports';

// What the user sees for each import: the page's address, or the photos' names
export const describeJob = (job: ImportJob) => {
  if (job.kind === 'url') {
    try {
      const url = new URL(job.url);
      return `${url.hostname.replace(/^www\./, '')}${url.pathname === '/' ? '' : url.pathname}`;
    } catch {
      return job.url;
    }
  }
  return job.files.map((file) => file.name).join(', ');
};

const STATUSES: Record<ItemStatus, { label: string; color: string; icon: typeof IconCheck }> = {
  queued: { label: 'Waiting', color: 'gray', icon: IconCircleDashed },
  importing: { label: 'Importing', color: 'orange', icon: IconCircleDashed },
  added: { label: 'Added', color: 'green', icon: IconCheck },
  review: { label: 'Needs review', color: 'yellow', icon: IconEdit },
  duplicate: { label: 'Already in your book', color: 'blue', icon: IconCopy },
  failed: { label: 'Failed', color: 'red', icon: IconAlertCircle },
  cancelled: { label: 'Cancelled', color: 'gray', icon: IconX },
  dismissed: { label: 'Dismissed', color: 'gray', icon: IconMinus },
};

type QueueListProps = {
  items: QueueItem[];
  queue: ImportQueue;
  onReview: (id: string) => void;
};

// Every recipe in the run, with what happened to it and what can be done next. Recipe links open
// in a new tab, since leaving would lose the queue
export function QueueList({ items, queue, onReview }: QueueListProps) {
  return (
    <Stack gap={0} component="ol" p={0} m={0} style={{ listStyle: 'none' }}>
      {items.map((item) => {
        const { label, color, icon: Icon } = STATUSES[item.status];
        return (
          <Group
            component="li"
            key={item.id}
            justify="space-between"
            wrap="nowrap"
            gap="sm"
            py="xs"
            style={{ borderTop: '1px solid var(--mantine-color-default-border)' }}
          >
            <Group gap="sm" wrap="nowrap" style={{ minWidth: 0 }}>
              {item.status === 'importing' ? (
                <Loader size={22} color="orange" aria-hidden />
              ) : (
                <ThemeIcon variant="light" color={color} size={22} radius="xl" aria-hidden>
                  <Icon size={14} />
                </ThemeIcon>
              )}
              <div style={{ minWidth: 0 }}>
                <Text size="sm" truncate title={describeJob(item.job)}>
                  {describeJob(item.job)}
                </Text>
                <Text size="xs" c="dimmed">
                  <Text span size="xs" fw={600} c={color === 'gray' ? 'dimmed' : color}>
                    {label}
                  </Text>
                  <Details item={item} />
                </Text>
              </div>
            </Group>
            <Actions item={item} queue={queue} onReview={onReview} />
          </Group>
        );
      })}
    </Stack>
  );
}

const RecipeLink = ({ recipe }: { recipe: { id: string; title: string } }) => (
  <Anchor href={recipePath(recipe.id)} target="_blank" rel="noopener" size="xs">
    {recipe.title}
  </Anchor>
);

function Details({ item }: { item: QueueItem }) {
  if (item.status === 'added' && item.recipe) {
    return (
      <>
        {': '}
        <RecipeLink recipe={item.recipe} />
      </>
    );
  }
  if (item.status === 'duplicate' && item.duplicateOf) {
    return (
      <>
        {': '}
        <RecipeLink recipe={item.duplicateOf} />
      </>
    );
  }
  if (item.status === 'review' && item.draft) {
    return <>: {item.draft.title || 'Untitled recipe'}</>;
  }
  if (item.status === 'failed' && item.error) {
    return <>: {item.error}</>;
  }
  return null;
}

function Actions({ item, queue, onReview }: Omit<QueueListProps, 'items'> & { item: QueueItem }) {
  switch (item.status) {
    case 'review':
      return (
        <Group gap="xs" wrap="nowrap">
          <Button size="compact-sm" color="orange" onClick={() => onReview(item.id)}>
            Review
          </Button>
          <Button size="compact-sm" variant="default" onClick={() => queue.dismiss(item.id)}>
            Dismiss
          </Button>
        </Group>
      );
    case 'duplicate':
      return (
        <Button size="compact-sm" variant="default" onClick={() => queue.importAnyway(item.id)}>
          Import anyway
        </Button>
      );
    case 'failed':
    case 'cancelled':
      return (
        <Button size="compact-sm" variant="default" onClick={() => queue.retry(item.id)}>
          {item.status === 'failed' ? 'Retry' : 'Import'}
        </Button>
      );
    default:
      return null;
  }
}
