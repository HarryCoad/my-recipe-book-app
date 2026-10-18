import { Text } from '@mantine/core';

// In place of a section that couldn't load. The rest of the dashboard still works
export function SectionError({ what }: { what: string }) {
  return (
    <Text c="dimmed" size="sm">
      Couldn't load {what} right now. Try refreshing the page.
    </Text>
  );
}
