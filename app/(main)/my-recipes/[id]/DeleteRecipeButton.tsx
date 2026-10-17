'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { IconAlertCircle, IconTrash } from '@tabler/icons-react';
import { ActionIcon, Alert, Button, Group, Modal, Stack, Text, Tooltip } from '@mantine/core';
import { useDisclosure } from '@mantine/hooks';
import axios from '@/helpers/axios';
import { Routes } from '@/helpers/constants';
import { endpoints } from '@/helpers/endpoints';
import { getErrorMessage } from '@/helpers/errors';
import { DeleteRecipeBody } from '@/types/recipe';

type DeleteRecipeButtonProps = {
  id: string;
  title: string;
  // Includes the author
  savedCount: number;
};

// Author only. Asks first, explaining that people who saved the recipe keep their copy.
export function DeleteRecipeButton({ id, title, savedCount }: DeleteRecipeButtonProps) {
  const router = useRouter();
  const [opened, { open, close }] = useDisclosure(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const otherSavers = savedCount - 1;

  const handleClose = () => {
    if (!deleting) {
      setError(null);
      close();
    }
  };

  const handleDelete = async () => {
    setDeleting(true);
    setError(null);
    try {
      const body: DeleteRecipeBody = { id };
      await axios.post(endpoints.recipes.delete, body);
      // Replaces the recipe in the history, so Back doesn't return to it
      router.replace(Routes.MY_RECIPES);
    } catch (err) {
      setError(getErrorMessage(err));
      setDeleting(false);
    }
  };

  return (
    <>
      <Tooltip label="Delete recipe">
        <ActionIcon variant="light" color="red" size="lg" aria-label="Delete recipe" onClick={open}>
          <IconTrash size={18} />
        </ActionIcon>
      </Tooltip>
      <Modal opened={opened} onClose={handleClose} title="Delete this recipe?" centered>
        <Stack>
          <Text>
            <strong>{title}</strong> will be removed from your recipes.
          </Text>
          {otherSavers > 0 ? (
            <Text size="sm" c="dimmed">
              {otherSavers} {otherSavers === 1 ? 'person has' : 'people have'} saved it, so they'll
              keep their copy, including any changes they made. It will no longer show you as the
              author, can't be changed, and its open suggestions will be removed.
            </Text>
          ) : (
            <Text size="sm" c="dimmed">
              Nobody else has saved it, so it will be deleted for good.
            </Text>
          )}
          {error && (
            <Alert color="red" icon={<IconAlertCircle />}>
              {error}
            </Alert>
          )}
          <Group justify="flex-end">
            <Button variant="default" onClick={handleClose} disabled={deleting}>
              Cancel
            </Button>
            <Button color="red" onClick={handleDelete} loading={deleting}>
              Delete
            </Button>
          </Group>
        </Stack>
      </Modal>
    </>
  );
}
