'use client';

import Link from 'next/link';
import styles from './recipe.module.scss';
import {
  IconChevronRight,
  IconPizza,
  IconSlice,
  IconSoup,
  IconToolsKitchen3,
} from '@tabler/icons-react';
import { Button, Container, Flex, Text, Title } from '@mantine/core';
import recipes from '@/devData/recipes.json';
import { Routes } from '@/helpers/constants';
import { Recipe } from './models';

export default function MyRecipes() {
  return (
    <>
      <Title className="" ta="center">
        My Recipes
      </Title>
      <ul className={styles.list}>
        {/* Map through the recipes and display them in a list */}
        {(recipes as Recipe[]).map((recipe) => (
          <li key={recipe.id} className={styles.listItem}>
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
                        <IconSoup stroke={1.5} size={15} /> {recipe.cookTime}
                      </span>
                    )}
                    <span className={styles.iconInfo} title="Serves">
                      <IconToolsKitchen3 stroke={1.5} size={15} /> {recipe.serves}
                    </span>
                  </Flex>
                </div>
                <Text size="sm" color="dimmed" mt={10}>
                  {recipe.description.slice(0, 270)}
                  {recipe.description.length > 270 ? '... ' : ' '}
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
                <Link href={`${Routes.MY_RECIPES}/${recipe.id}`} className={styles.link}>
                  <Button mt={10} variant="outline" color="orange" size="m">
                    <Flex gap={5} align="center">
                      View Recipe
                      <IconChevronRight stroke={2} size={15} />
                    </Flex>
                  </Button>
                </Link>
              </Flex>
            </div>
          </li>
        ))}
      </ul>
    </>
  );
}
