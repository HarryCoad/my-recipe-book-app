import { ComponentType, ReactNode } from 'react';
import Link from 'next/link';
import classes from './dashboard.module.scss';
import { IconBook, IconChefHat, IconMessage2, IconMessageCheck } from '@tabler/icons-react';
import {
  Anchor,
  Badge,
  Group,
  Paper,
  SimpleGrid,
  Stack,
  Text,
  ThemeIcon,
  Title,
} from '@mantine/core';
import { reviewSuggestionsPath, Routes } from '@/helpers/constants';
import { endpoints } from '@/helpers/endpoints';
import { getSession, serverGet } from '@/helpers/serverApi';
import { MySuggestionsResponse } from '@/types/recipe';
import { countRecipes, loadSection, searchRecipes } from './data';
import { SectionError } from './SectionError';

// The user's own recipes are checked for suggestions in one request, so beyond this many, later
// ones are missed. Plenty for a personal recipe book
const OWN_RECIPES_LIMIT = 100;

// Numbers at a glance, each linking to where to act on them, then any recipes with suggestions
// waiting for the user to review
export async function AtAGlance() {
  const { userId } = await getSession();
  const data = await loadSection(async () => {
    const [created, inBook, own, mine] = await Promise.all([
      countRecipes({ authorId: userId }),
      // Includes the user's own recipes, since authors keep them saved
      countRecipes({ bOnlySaved: true }),
      searchRecipes({ authorId: userId, limit: OWN_RECIPES_LIMIT }),
      serverGet<MySuggestionsResponse>(endpoints.recipes.mySuggestions),
    ]);
    const toReview = own.data.filter((recipe) => recipe.pendingSuggestions > 0);
    const suggestions = mine.data.suggestions;
    return {
      created,
      inBook,
      toReview,
      waitingForReview: toReview.reduce((sum, recipe) => sum + recipe.pendingSuggestions, 0),
      sent: suggestions.filter((suggestion) => suggestion.status === 'pending').length,
      accepted: suggestions.filter((suggestion) => suggestion.status === 'accepted').length,
    };
  });

  if (!data) {
    return <SectionError what="your numbers" />;
  }

  const { created, inBook, toReview, waitingForReview, sent, accepted } = data;
  // Straight to the recipe when only one has suggestions
  const reviewHref =
    toReview.length === 1
      ? reviewSuggestionsPath(toReview[0].id)
      : `${Routes.MY_RECIPES}?mine=true`;

  return (
    <Stack gap="md">
      <SimpleGrid cols={{ base: 1, xs: 2, md: 4 }} spacing="sm">
        <Stat
          icon={IconBook}
          value={inBook}
          label={inBook === 1 ? 'recipe in your book' : 'recipes in your book'}
          href={Routes.MY_RECIPES}
        />
        <Stat
          icon={IconChefHat}
          value={created}
          label={created === 1 ? 'recipe you created' : 'recipes you created'}
          href={`${Routes.MY_RECIPES}?mine=true`}
        />
        <Stat
          icon={IconMessage2}
          value={waitingForReview}
          label={waitingForReview === 1 ? 'suggestion to review' : 'suggestions to review'}
          href={reviewHref}
          highlight={waitingForReview > 0}
        />
        <Stat
          icon={IconMessageCheck}
          value={sent}
          label={sent === 1 ? 'suggestion you sent is waiting' : 'suggestions you sent are waiting'}
          detail={`${accepted} accepted so far`}
          href={Routes.MY_SUGGESTIONS}
        />
      </SimpleGrid>

      {toReview.length > 0 && (
        <Paper withBorder p="md" radius="md">
          <Title order={2} size="h4" mb="xs">
            Waiting for your review
          </Title>
          <Stack gap="xs">
            {toReview.map((recipe) => (
              <Group key={recipe.id} justify="space-between" wrap="nowrap">
                <Anchor component={Link} href={reviewSuggestionsPath(recipe.id)} lineClamp={1}>
                  {recipe.title}
                </Anchor>
                <Badge color="red" variant="light">
                  {recipe.pendingSuggestions}{' '}
                  {recipe.pendingSuggestions === 1 ? 'suggestion' : 'suggestions'}
                </Badge>
              </Group>
            ))}
          </Stack>
        </Paper>
      )}
    </Stack>
  );
}

type StatProps = {
  icon: ComponentType<any>;
  value: number;
  label: string;
  detail?: ReactNode;
  href: string;
  // Drawn in red, for something waiting on the user
  highlight?: boolean;
};

function Stat({ icon: Icon, value, label, detail, href, highlight = false }: StatProps) {
  return (
    <Paper component={Link} href={href} withBorder p="md" className={classes.linkCard}>
      <Group justify="space-between" align="flex-start" wrap="nowrap">
        <div>
          <Text fz={28} fw={700} lh={1.1} c={highlight ? 'red' : undefined}>
            {value}
          </Text>
          <Text size="sm" c="dimmed">
            {label}
          </Text>
          {detail && (
            <Text size="xs" c="dimmed" mt={4}>
              {detail}
            </Text>
          )}
        </div>
        <ThemeIcon variant="light" color={highlight ? 'red' : 'orange'} size={34} radius="md">
          <Icon size={18} />
        </ThemeIcon>
      </Group>
    </Paper>
  );
}
