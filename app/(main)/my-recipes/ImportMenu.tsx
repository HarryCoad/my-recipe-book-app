'use client';

import Link from 'next/link';
import { IconChevronDown, IconFileImport, IconLink, IconPhoto } from '@tabler/icons-react';
import { Button, Menu } from '@mantine/core';
import { Routes } from '@/helpers/constants';

// The two ways to start a recipe from somewhere else. Both open the create page, ready to import.
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
          From a photo
        </Menu.Item>
      </Menu.Dropdown>
    </Menu>
  );
}
