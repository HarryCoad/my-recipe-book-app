import Link from 'next/link';
import { IconToolsKitchen2Off } from '@tabler/icons-react';
import { Button, Container, Text, Title } from '@mantine/core';
import { Routes } from '@/helpers/constants';

// Shown when page.tsx calls notFound(). The API gives the same answer for a recipe that doesn't
// exist and one the user can't see, so this doesn't say which.
export default function RecipeNotFound() {
  return (
    <Container size="sm" ta="center" mt="10vh">
      <IconToolsKitchen2Off size={56} stroke={1.5} color="var(--mantine-color-dimmed)" />
      <Title order={2} mt="md">
        Recipe not found
      </Title>
      <Text c="dimmed" mt="sm">
        It may have been deleted, or it's private.
      </Text>
      <Button component={Link} href={Routes.MY_RECIPES} mt="lg" color="orange">
        Back to My Recipes
      </Button>
    </Container>
  );
}
