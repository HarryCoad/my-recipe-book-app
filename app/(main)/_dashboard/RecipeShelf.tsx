import Link from 'next/link';
import { IconClock, IconUsers } from '@tabler/icons-react';
import { Anchor, Badge, Group, Paper, SimpleGrid, Stack, Text, Title } from '@mantine/core';
import { SaveRecipeButton } from '@/components/SaveRecipeButton/SaveRecipeButton';
import { UserLink } from '@/components/UserLink/UserLink';
import { recipePath } from '@/helpers/constants';
import { convertMinutesToHoursAndMinutes } from '@/helpers/convertMin';
import { totalTime } from '@/helpers/recipes';
import { RecipeSearchResult } from '@/types/recipe';
import { loadSection, searchRecipes } from './data';
import { SectionError } from './SectionError';

type RecipeShelfProps = {
  title: string;
  // GET /recipes/search params, e.g. { sort: 'popular' }
  search: Record<string, string | number | boolean>;
  // The full list on Find Recipes
  seeAllHref: string;
  empty: string;
};

const SHELF_SIZE = 4;

// A few recipes the user hasn't saved yet, to try something new
export async function RecipeShelf({ title, search, seeAllHref, empty }: RecipeShelfProps) {
  const recipes = await loadSection(
    async () => (await searchRecipes({ ...search, bHideSaved: true, limit: SHELF_SIZE })).data
  );

  return (
    <section>
      <Group justify="space-between" align="baseline" mb="sm">
        <Title order={2} size="h3">
          {title}
        </Title>
        <Anchor component={Link} href={seeAllHref} size="sm">
          See all
        </Anchor>
      </Group>
      {recipes === null ? (
        <SectionError what="these recipes" />
      ) : recipes.length === 0 ? (
        <Text c="dimmed" size="sm">
          {empty}
        </Text>
      ) : (
        <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="sm">
          {recipes.map((recipe) => (
            <ShelfCard key={recipe.id} recipe={recipe} />
          ))}
        </SimpleGrid>
      )}
    </section>
  );
}

function ShelfCard({ recipe }: { recipe: RecipeSearchResult }) {
  return (
    <Paper component="article" withBorder p="md" radius="md">
      <Group justify="space-between" align="flex-start" wrap="nowrap" gap="xs">
        <Stack gap={6} style={{ minWidth: 0 }}>
          <Anchor component={Link} href={recipePath(recipe.id)} fw={600} lineClamp={2}>
            {recipe.title}
          </Anchor>
          <Group gap="xs">
            <Badge variant="light" color="orange" size="sm">
              {recipe.category}
            </Badge>
            <Group gap={4} c="dimmed">
              <IconClock size={14} aria-hidden />
              <Text size="xs">{convertMinutesToHoursAndMinutes(totalTime(recipe))}</Text>
            </Group>
            <Group gap={4} c="dimmed">
              <IconUsers size={14} aria-hidden />
              <Text size="xs">Serves {recipe.serves}</Text>
            </Group>
          </Group>
          {recipe.authorId && recipe.authorName && (
            <Text size="xs" c="dimmed">
              By{' '}
              <UserLink id={recipe.authorId} size="xs">
                {recipe.authorName}
              </UserLink>
            </Text>
          )}
        </Stack>
        <SaveRecipeButton id={recipe.id} title={recipe.title} bSaved={recipe.bSaved} />
      </Group>
    </Paper>
  );
}
