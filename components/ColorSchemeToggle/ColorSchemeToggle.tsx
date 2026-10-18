'use client';

import { IconMoon, IconSun } from '@tabler/icons-react';
import {
  Box,
  Center,
  MantineColorScheme,
  SegmentedControl,
  Tooltip,
  useMantineColorScheme,
  VisuallyHidden,
} from '@mantine/core';
import { useMounted } from '@mantine/hooks';

const OPTIONS = [
  { value: 'light', label: 'Light', icon: IconSun },
  { value: 'dark', label: 'Dark', icon: IconMoon },
  // { value: 'auto', label: 'Match your device', icon: IconDeviceDesktop },
] as const;

// Light, dark or the device's setting, as three icons. The choice is saved in the browser, which
// the server can't see, so the control waits until the page has loaded to show it
export function ColorSchemeToggle() {
  const { colorScheme, setColorScheme } = useMantineColorScheme();
  const mounted = useMounted();

  if (!mounted) {
    // Holds its place, so the header doesn't shift when it appears
    return <Box w={102} h={30} />;
  }

  return (
    <SegmentedControl
      size="xs"
      radius="xl"
      value={colorScheme}
      onChange={(value) => setColorScheme(value as MantineColorScheme)}
      data={OPTIONS.map(({ value, label, icon: Icon }) => ({
        value,
        label: (
          <Tooltip label={label}>
            <Center>
              <Icon size={20} stroke={1.5} aria-hidden />
              <VisuallyHidden>{label}</VisuallyHidden>
            </Center>
          </Tooltip>
        ),
      }))}
    />
  );
}
