'use client';

import { useState } from 'react';
import { IconMinus, IconPlus } from '@tabler/icons-react';
import {
  ActionIcon,
  Button,
  Group,
  List,
  ListItem,
  Paper,
  Stack,
  Text,
  Title,
} from '@mantine/core';
import { formatIngredient, groupIngredients } from '@/helpers/recipes';
import { Ingredient } from '@/types/recipe';

const MAX_SERVINGS = 99;

// The ingredients, with a stepper to cook for more or fewer people than the recipe serves. The
// quantities scale with it. Only this view changes, not the recipe.
export function IngredientsPanel({
  ingredients,
  serves,
}: {
  ingredients: Ingredient[];
  serves: number;
}) {
  const [servings, setServings] = useState(serves);
  const scale = servings / serves;
  const groups = groupIngredients(ingredients);

  return (
    <Paper withBorder p="lg" radius="md">
      <Group justify="space-between" align="center" mb="md">
        <Title order={3}>Ingredients</Title>
        <Group gap={6} wrap="nowrap">
          <ActionIcon
            variant="light"
            color="orange"
            aria-label="Fewer servings"
            disabled={servings <= 1}
            onClick={() => setServings(servings - 1)}
          >
            <IconMinus size={16} />
          </ActionIcon>
          <Text fw={600} miw={72} ta="center" aria-live="polite">
            Serves {servings}
          </Text>
          <ActionIcon
            variant="light"
            color="orange"
            aria-label="More servings"
            disabled={servings >= MAX_SERVINGS}
            onClick={() => setServings(servings + 1)}
          >
            <IconPlus size={16} />
          </ActionIcon>
        </Group>
      </Group>
      {servings !== serves && (
        <Group justify="space-between" mb="md" gap="xs">
          <Text size="sm" c="dimmed">
            Scaled from {serves} {serves === 1 ? 'serving' : 'servings'}
          </Text>
          <Button variant="subtle" size="compact-sm" onClick={() => setServings(serves)}>
            Reset
          </Button>
        </Group>
      )}
      <Stack gap="lg">
        {groups.map((group, i) => (
          <div key={i}>
            {group.subheader && (
              <Title order={4} size="h5" mb="xs" c="orange">
                {group.subheader}
              </Title>
            )}
            <List spacing="xs">
              {group.ingredients.map((ingredient) => (
                <ListItem key={ingredient.id}>{formatIngredient(ingredient, scale)}</ListItem>
              ))}
            </List>
          </div>
        ))}
      </Stack>
    </Paper>
  );
}
