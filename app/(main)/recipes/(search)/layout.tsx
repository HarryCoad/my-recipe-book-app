import { ReactNode } from 'react';
import { Container, Title } from '@mantine/core';
import { RecipeSearchFilters } from './RecipeSearchFilters';

export const metadata = { title: 'Find Recipes' };

// The filters live in the layout, so they stay mounted while the results below reload. Typing in
// the search box keeps its focus and cursor as each search loads.
export default function RecipeSearchLayout({ children }: { children: ReactNode }) {
  return (
    <Container size="md" px={0} pb="xl">
      <Title ta="center">Find Recipes</Title>
      <RecipeSearchFilters />
      {children}
    </Container>
  );
}
