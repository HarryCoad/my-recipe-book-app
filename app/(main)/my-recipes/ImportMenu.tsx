'use client';

import Link from 'next/link';
import {
  IconChevronDown,
  IconFileImport,
  IconLink,
  IconPhoto,
  IconStack2,
} from '@tabler/icons-react';
import { Button, Menu } from '@mantine/core';
import { Routes } from '@/helpers/constants';

// Ways to start recipes from somewhere else: one from a website or photos, on the create page
// ready to import, or lots at once with bulk import.
// A client component, so the menu's button is made here (Mantine clones it to attach the menu)
export function ImportMenu() {
  return (
    <Menu position="bottom-end" withinPortal>
      <Menu.Target>
        <Button
          variant="light"
          color="orange"
          leftSection={<IconFileImport size={18} />}
          rightSection={<IconChevronDown size={16} />}
        >
          Import
        </Button>
      </Menu.Target>
      <Menu.Dropdown>
        <Menu.Item
          component={Link}
          href={`${Routes.NEW_RECIPE}?import=url`}
          leftSection={<IconLink size={16} />}
        >
          From a website
        </Menu.Item>
        <Menu.Item
          component={Link}
          href={`${Routes.NEW_RECIPE}?import=image`}
          leftSection={<IconPhoto size={16} />}
        >
          From photos
        </Menu.Item>
        <Menu.Divider />
        <Menu.Item
          component={Link}
          href={Routes.BULK_IMPORT}
          leftSection={<IconStack2 size={16} />}
        >
          Lots at once
        </Menu.Item>
      </Menu.Dropdown>
    </Menu>
  );
}
