'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { IconBookmark, IconBookmarkFilled } from '@tabler/icons-react';
import { ActionIcon, Button, Group, Modal, Stack, Text, Tooltip } from '@mantine/core';
import { notifications } from '@mantine/notifications';
import axios from '@/helpers/axios';
import { endpoints } from '@/helpers/endpoints';
import { getErrorCode, getErrorMessage } from '@/helpers/errors';
import { ToggleSaveBody } from '@/types/recipe';

type SaveRecipeButtonProps = {
  id: string;
  title: string;
  bSaved: boolean;
  // The author deleted it, so once unsaved the user can't find it again. Asks first, then goes
  // to `leaveTo` if given, since the recipe may no longer exist.
  orphaned?: boolean;
  leaveTo?: string;
};

// Why unsaving needs confirming: the API refused because of personal edits, or the recipe has
// no author
type Confirm = 'edits' | 'orphaned' | null;

// Saves or unsaves a recipe someone else wrote. Authors can't unsave their own, so don't show it
// to them.
export function SaveRecipeButton({ id, title, bSaved, orphaned, leaveTo }: SaveRecipeButtonProps) {
  const router = useRouter();
  const [saved, setSaved] = useState(bSaved);
  const [busy, setBusy] = useState(false);
  const [confirm, setConfirm] = useState<Confirm>(null);

  // Follows the server once the page refreshes
  useEffect(() => setSaved(bSaved), [bSaved]);

  const send = async (bSave: boolean, bConfirmLoseEdits?: boolean) => {
    setBusy(true);
    try {
      const body: ToggleSaveBody = { id, bSave, bConfirmLoseEdits };
      await axios.post(endpoints.recipes.toggleSave, body);
      setSaved(bSave);
      setConfirm(null);
      notifications.show({
        color: bSave ? 'green' : 'gray',
        message: bSave ? `Saved "${title}"` : `Removed "${title}" from your saved recipes`,
      });
      if (!bSave && leaveTo) {
        router.replace(leaveTo);
      } else {
        // Updates counts and badges that the server rendered
        router.refresh();
      }
    } catch (err) {
      if (getErrorCode(err) === 'CONFIRM_LOSE_EDITS') {
        setConfirm('edits');
      } else {
        setConfirm(null);
        notifications.show({ color: 'red', message: getErrorMessage(err) });
      }
    } finally {
      setBusy(false);
    }
  };

  const handleClick = () => {
    if (!saved) {
      send(true);
    } else if (orphaned) {
      setConfirm('orphaned');
    } else {
      send(false);
    }
  };

  const label = saved ? 'Unsave recipe' : 'Save recipe';

  return (
    <>
      <Tooltip label={label}>
        <ActionIcon
          variant={saved ? 'filled' : 'light'}
          color="orange"
          size="lg"
          aria-label={label}
          aria-pressed={saved}
          loading={busy && !confirm}
          onClick={handleClick}
        >
          {saved ? <IconBookmarkFilled size={18} /> : <IconBookmark size={18} />}
        </ActionIcon>
      </Tooltip>
      <Modal
        opened={confirm !== null}
        onClose={() => !busy && setConfirm(null)}
        title="Unsave this recipe?"
        centered
      >
        <Stack>
          <Text>
            {confirm === 'orphaned'
              ? `The author deleted "${title}", so once you unsave it you won't be able to find it again. Any changes you made to it will be lost too.`
              : `You've made your own changes to "${title}". Unsaving it will delete them.`}
          </Text>
          <Group justify="flex-end">
            <Button variant="default" onClick={() => setConfirm(null)} disabled={busy}>
              Keep it
            </Button>
            <Button color="red" loading={busy} onClick={() => send(false, true)}>
              Unsave
            </Button>
          </Group>
        </Stack>
      </Modal>
    </>
  );
}
