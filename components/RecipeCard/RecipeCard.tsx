import { ReactNode } from 'react';
import Link from 'next/link';
import styles from './RecipeCard.module.scss';
import {
  IconChevronRight,
  IconFlame,
  IconMessage2,
  IconPizza,
  IconSlice,
  IconToolsKitchen3,
  IconUser,
} from '@tabler/icons-react';
import { Badge, Button, Container, Flex, Text } from '@mantine/core';
import { BadgeLink } from '@/components/TooltipLink/TooltipLink';
import { reviewSuggestionsPath } from '@/helpers/constants';
import { RecipeSearchResult } from '@/types/recipe';

const DESCRIPTION_LENGTH = 270;

type RecipeCardProps = {
  recipe: RecipeSearchResult;
  // Where "View Recipe" goes, e.g. `/recipes/<id>`
  href: string;
  // Shows a "Your recipe" badge, for lists that mix the user's recipes with other people's
  isOwn?: boolean;
  // Shown in the top right corner, such as a save button
  action?: ReactNode;
};

// No client code, so it renders on the server unless a client component uses it
export function RecipeCard({ recipe, href, isOwn, action }: RecipeCardProps) {
  const pending = recipe.pendingSuggestions;

  return (
    <article className={styles.card}>
      {/* Recipes don't have images yet, so show a placeholder */}
      <Flex justify="center" align="center">
        <div className={styles.emptyImage}>
          <IconPizza stroke={1.5} size={50} />
        </div>
      </Flex>

      <div className={styles.content}>
        <Flex justify="space-between" gap={10} align="center" mt={10}>
          <Text size="xl">{recipe.title}</Text>
          <Flex gap={6} align="center">
            {/* Only the author gets a count, and it goes straight to reviewing them */}
            {pending > 0 && (
              <BadgeLink
                label="Review suggestions"
                ariaLabel={`${pending} ${pending === 1 ? 'suggestion' : 'suggestions'} waiting for review`}
                href={reviewSuggestionsPath(recipe.id)}
                leftSection={<IconMessage2 size={12} />}
              >
                {pending}
              </BadgeLink>
            )}
            {isOwn && (
              <Badge variant="light" color="blue" leftSection={<IconUser size={12} />}>
                Your recipe
              </Badge>
            )}
            <span title="Category" className={`${styles.iconInfo} ${styles.category}`}>
              {recipe.category}
            </span>
            {action}
          </Flex>
        </Flex>

        <Container mt={10} w="100%" p={0}>
          <div className={styles.floatRight}>
            <Flex gap={5} align="center">
              {recipe.prepTime > 0 && (
                <span className={styles.iconInfo} title="Prep Time">
                  <IconSlice stroke={1.5} size={15} /> {recipe.prepTime}
                </span>
              )}
              {recipe.cookTime > 0 && (
                <span className={styles.iconInfo} title="Cook Time">
                  <IconFlame stroke={1.5} size={15} /> {recipe.cookTime}
                </span>
              )}
              <span className={styles.iconInfo} title="Serves">
                <IconToolsKitchen3 stroke={1.5} size={15} /> {recipe.serves}
              </span>
            </Flex>
          </div>
          {recipe.description && (
            <Text size="sm" c="dimmed" mt={10}>
              {recipe.description.slice(0, DESCRIPTION_LENGTH)}
              {recipe.description.length > DESCRIPTION_LENGTH ? '... ' : ' '}
            </Text>
          )}
          <div className={styles.clearfix} />
        </Container>

        <Flex align="flex-end" justify="space-between" style={{ marginTop: 'auto' }}>
          <Flex gap={10} align="center" wrap="wrap">
            {recipe.tags.map((tag, i) => (
              <span className={styles.tag} key={i}>
                {tag}
              </span>
            ))}
          </Flex>
          <Button
            component={Link}
            href={href}
            mt={10}
            variant="outline"
            color="orange"
            rightSection={<IconChevronRight stroke={2} size={15} />}
          >
            View Recipe
          </Button>
        </Flex>
      </div>
    </article>
  );
}
