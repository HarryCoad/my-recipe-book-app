'use client';

import { useState } from 'react';
import { Switch } from '@mantine/core';
import { notifications } from '@mantine/notifications';
import axios from '@/helpers/axios';
import { endpoints } from '@/helpers/endpoints';
import { getErrorMessage } from '@/helpers/errors';
import { UpdateMeBody, UpdateMeResponse } from '@/types/user';

// Saves as soon as it's switched, showing the change straight away. If saving fails it switches
// back, so it always shows what's saved
export function PrivateSavesSwitch({ bPrivateSaves }: { bPrivateSaves: boolean }) {
  const [checked, setChecked] = useState(bPrivateSaves);
  const [saving, setSaving] = useState(false);

  const save = async (next: boolean) => {
    setChecked(next);
    setSaving(true);
    try {
      const body: UpdateMeBody = { bPrivateSaves: next };
      const res = await axios.patch<UpdateMeResponse>(endpoints.users.updateMe, body);
      const saved = res.data.data.user.bPrivateSaves;
      setChecked(saved);
      notifications.show({
        color: 'green',
        message: saved
          ? 'Your saved recipes are now private.'
          : 'Your saved recipes now show on your profile.',
      });
    } catch (err) {
      setChecked(!next);
      notifications.show({ color: 'red', message: getErrorMessage(err) });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Switch
      label="Keep my saved recipes private"
      description="Other people won't see the recipes you've saved on your profile. You'll still see them."
      checked={checked}
      disabled={saving}
      onChange={(event) => save(event.currentTarget.checked)}
    />
  );
}
