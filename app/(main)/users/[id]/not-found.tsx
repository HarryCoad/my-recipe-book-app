import Link from 'next/link';
import { IconUserOff } from '@tabler/icons-react';
import { Button, Container, Text, Title } from '@mantine/core';
import { Routes } from '@/helpers/constants';

// Shown when page.tsx calls notFound(): the ID is malformed, or no active user has it
export default function UserNotFound() {
  return (
    <Container size="sm" ta="center" mt="10vh">
      <IconUserOff size={56} stroke={1.5} color="var(--mantine-color-dimmed)" />
      <Title order={2} mt="md">
        User not found
      </Title>
      <Text c="dimmed" mt="sm">
        They may have deleted their account.
      </Text>
      <Button component={Link} href={Routes.RECIPES} mt="lg" color="orange">
        Find recipes
      </Button>
    </Container>
  );
}
