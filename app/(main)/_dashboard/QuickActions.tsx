import { ComponentType } from 'react';
import Link from 'next/link';
import classes from './dashboard.module.scss';
import { IconLink, IconPhoto, IconPlus, IconSearch } from '@tabler/icons-react';
import { Group, Paper, SimpleGrid, Text, ThemeIcon } from '@mantine/core';
import { Routes } from '@/helpers/constants';

type Action = { label: string; description: string; href: string; icon: ComponentType<any> };

const ACTIONS: Action[] = [
  {
    label: 'Create a recipe',
    description: 'Write one up yourself',
    href: Routes.NEW_RECIPE,
    icon: IconPlus,
  },
  {
    label: 'Import from a website',
    description: 'Paste a link to a recipe',
    href: `${Routes.NEW_RECIPE}?import=url`,
    icon: IconLink,
  },
  {
    label: 'Import from a photo',
    description: 'A cookbook page or a recipe card',
    href: `${Routes.NEW_RECIPE}?import=image`,
    icon: IconPhoto,
  },
  {
    label: 'Find recipes',
    description: 'See what others are cooking',
    href: Routes.RECIPES,
    icon: IconSearch,
  },
];

export function QuickActions() {
  return (
    <SimpleGrid cols={{ base: 1, xs: 2, md: 4 }} spacing="sm">
      {ACTIONS.map(({ label, description, href, icon: Icon }) => (
        <Paper
          key={href}
          component={Link}
          href={href}
          withBorder
          p="md"
          className={classes.linkCard}
        >
          <Group wrap="nowrap" gap="sm">
            <ThemeIcon variant="light" color="orange" size={38} radius="md">
              <Icon size={20} />
            </ThemeIcon>
            <div>
              <Text fw={600} size="sm">
                {label}
              </Text>
              <Text c="dimmed" size="xs">
                {description}
              </Text>
            </div>
          </Group>
        </Paper>
      ))}
    </SimpleGrid>
  );
}
