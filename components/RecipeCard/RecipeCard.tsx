import Link from 'next/link';
import styles from './RecipeCard.module.scss';
import {
  IconChevronRight,
  IconFlame,
  IconPizza,
  IconSlice,
  IconToolsKitchen3,
} from '@tabler/icons-react';
import { Button, Container, Flex, Text } from '@mantine/core';
import { Recipe } from '@/types/recipe';

const DESCRIPTION_LENGTH = 270;

type RecipeCardProps = {
  recipe: Recipe;
  // Where "View Recipe" goes, e.g. `/my-recipes/<id>`
  href: string;
};

// No client code, so it renders on the server unless a client component uses it
export function RecipeCard({ recipe, href }: RecipeCardProps) {
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
          <span title="Category" className={`${styles.iconInfo} ${styles.category}`}>
            {recipe.category}
          </span>
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
          <Text size="sm" c="dimmed" mt={10}>
            {recipe.description.slice(0, DESCRIPTION_LENGTH)}
            {recipe.description.length > DESCRIPTION_LENGTH ? '... ' : ' '}
          </Text>
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
