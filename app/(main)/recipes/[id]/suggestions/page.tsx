import Link from 'next/link';
import { redirect } from 'next/navigation';
import styles from '../myRecipe.module.scss';
import { IconInfoCircle } from '@tabler/icons-react';
import { Alert, Anchor, Container, Stack, Text, Title } from '@mantine/core';
import BackButton from '@/components/BackButton/BackButton';
import { SuggestionCard } from '@/components/Suggestions/SuggestionCard';
import { SuggestionChanges } from '@/components/Suggestions/SuggestionChanges';
import { recipePath } from '@/helpers/constants';
import { getSession } from '@/helpers/serverApi';
import { Edit } from '@/types/recipe';
import { getRecipe } from '../getRecipe';
import { getSuggestions } from '../getSuggestions';
import { ReviewButtons } from './ReviewButtons';

type PageProps = { params: Promise<{ id: string }> };

export async function generateMetadata({ params }: PageProps) {
  const { recipe } = await getRecipe((await params).id);
  return { title: `Suggestions for ${recipe.title}` };
}

// The author reviews suggestions here, each shown as what accepting it would change
export default async function ReviewSuggestionsPage({ params }: PageProps) {
  const { id } = await params;
  const [{ recipe }, { userId }] = await Promise.all([getRecipe(id), getSession()]);

  // Only the author can review. Anyone else is sent to the recipe itself
  if (recipe.authorId !== userId) {
    redirect(recipePath(recipe.id));
  }

  const suggestions = await getSuggestions(id, { all: true });
  const pending = suggestions.filter((suggestion) => suggestion.status === 'pending');
  const reviewed = suggestions.filter((suggestion) => suggestion.status !== 'pending');

  return (
    <Container size="md" px={0} pb="xl">
      <div className={styles.Header}>
        <BackButton href={recipePath(recipe.id)} />
        <Title ta="center">Suggestions</Title>
      </div>
      <Text ta="center" mt="xs">
        For{' '}
        <Anchor component={Link} href={recipePath(recipe.id)}>
          {recipe.title}
        </Anchor>
      </Text>

      <Stack gap="md" mt="lg">
        {!recipe.bAllowSuggestions && (
          <Alert color="gray" icon={<IconInfoCircle />}>
            This recipe isn't open to new suggestions. You can turn them on by editing it.
          </Alert>
        )}

        <Title order={2} size="h3">
          Waiting for review ({pending.length})
        </Title>
        {pending.length === 0 ? (
          <Text c="dimmed">No suggestions are waiting for review.</Text>
        ) : (
          pending.map((suggestion) => (
            <SuggestionCard
              key={suggestion.id}
              suggestion={suggestion}
              heading={<Suggester suggestion={suggestion} />}
            >
              <SuggestionChanges recipe={recipe} suggestion={suggestion} />
              <ReviewButtons id={suggestion.id} />
            </SuggestionCard>
          ))
        )}

        {reviewed.length > 0 && (
          <>
            <Title order={2} size="h3" mt="lg">
              Reviewed
            </Title>
            {reviewed.map((suggestion) => (
              <SuggestionCard
                key={suggestion.id}
                suggestion={suggestion}
                heading={<Suggester suggestion={suggestion} />}
              />
            ))}
          </>
        )}
      </Stack>
    </Container>
  );
}

function Suggester({ suggestion }: { suggestion: Edit }) {
  // No name when their account was deleted
  return (
    <Text fw={600}>{suggestion.userName ?? 'Someone who has since left'} suggested changes</Text>
  );
}
