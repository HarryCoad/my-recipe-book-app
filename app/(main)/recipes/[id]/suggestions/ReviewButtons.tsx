'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { IconCheck, IconX } from '@tabler/icons-react';
import { Button, Group } from '@mantine/core';
import { notifications } from '@mantine/notifications';
import axios from '@/helpers/axios';
import { endpoints } from '@/helpers/endpoints';
import { getErrorCode, getErrorMessage } from '@/helpers/errors';
import { ReviewSuggestionBody } from '@/types/recipe';

// Accepting applies the suggestion to the recipe for everyone. Either way the page refreshes, so
// the remaining suggestions are compared with the recipe as it now is
export function ReviewButtons({ id }: { id: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState<'accept' | 'reject' | null>(null);

  const review = async (bAccept: boolean) => {
    setBusy(bAccept ? 'accept' : 'reject');
    try {
      const body: ReviewSuggestionBody = { id, bAccept };
      await axios.post(endpoints.recipes.reviewSuggestion, body);
      notifications.show({
        color: bAccept ? 'green' : 'gray',
        message: bAccept
          ? 'Suggestion accepted. Your recipe has been updated.'
          : 'Suggestion rejected.',
      });
      router.refresh();
    } catch (err) {
      notifications.show({ color: 'red', message: getErrorMessage(err) });
      // Reviewed elsewhere in the meantime, so show where it stands now
      if (getErrorCode(err) === 'SUGGESTION_ALREADY_REVIEWED') {
        router.refresh();
      }
    } finally {
      setBusy(null);
    }
  };

  return (
    <Group justify="flex-end" gap="xs">
      <Button
        variant="default"
        leftSection={<IconX size={16} />}
        loading={busy === 'reject'}
        disabled={busy === 'accept'}
        onClick={() => review(false)}
      >
        Reject
      </Button>
      <Button
        color="green"
        leftSection={<IconCheck size={16} />}
        loading={busy === 'accept'}
        disabled={busy === 'reject'}
        onClick={() => review(true)}
      >
        Accept
      </Button>
    </Group>
  );
}
