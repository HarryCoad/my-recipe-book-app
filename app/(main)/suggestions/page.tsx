import Link from 'next/link';
import { Anchor, Container, Stack, Text, Title } from '@mantine/core';
import { SuggestionCard } from '@/components/Suggestions/SuggestionCard';
import { recipePath } from '@/helpers/constants';
import { endpoints } from '@/helpers/endpoints';
import { serverGet } from '@/helpers/serverApi';
import { MySuggestionsResponse } from '@/types/recipe';

export const metadata = { title: 'My Suggestions' };

// Every suggestion the user has made, newest first, and whether it was accepted
export default async function MySuggestionsPage() {
  const { data } = await serverGet<MySuggestionsResponse>(endpoints.recipes.mySuggestions);
  const { suggestions } = data;

  return (
    <Container size="md" px={0} pb="xl">
      <Title ta="center">My Suggestions</Title>

      {suggestions.length === 0 ? (
        <Text ta="center" c="dimmed" mt="xl">
          You haven't suggested any changes yet. Save a recipe that's open to suggestions, then use
          "Suggest changes" on it.
        </Text>
      ) : (
        <Stack gap="md" mt="lg">
          {suggestions.map((suggestion) => (
            <SuggestionCard
              key={suggestion.id}
              suggestion={suggestion}
              heading={
                suggestion.recipeId ? (
                  <Anchor component={Link} href={recipePath(suggestion.recipeId.id)} fw={600}>
                    {suggestion.recipeId.title}
                  </Anchor>
                ) : (
                  <Text fw={600} c="dimmed">
                    A recipe that's been deleted
                  </Text>
                )
              }
            />
          ))}
        </Stack>
      )}
    </Container>
  );
}
