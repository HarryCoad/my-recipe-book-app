'use client';

import { useOptimistic, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Switch } from '@mantine/core';
import { Routes } from '@/helpers/constants';

// Narrows the recipe book to recipes the user created. Kept in the URL, and replaces it so the
// history doesn't fill up. Shows the change straight away while the list loads.
export function OnlyMineSwitch({ onlyMine }: { onlyMine: boolean }) {
  const router = useRouter();
  const [, startTransition] = useTransition();
  const [checked, setChecked] = useOptimistic(onlyMine);

  return (
    <Switch
      label="Only recipes I created"
      checked={checked}
      onChange={(event) => {
        const next = event.currentTarget.checked;
        // Back to the first page, since the other list may have fewer
        startTransition(() => {
          setChecked(next);
          router.replace(next ? `${Routes.MY_RECIPES}?mine=true` : Routes.MY_RECIPES, {
            scroll: false,
          });
        });
      }}
    />
  );
}
