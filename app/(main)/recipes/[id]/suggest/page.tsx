import { redirect } from 'next/navigation';
import styles from '../myRecipe.module.scss';
import { Container, Title } from '@mantine/core';
import BackButton from '@/components/BackButton/BackButton';
import { recipePath } from '@/helpers/constants';
import { canSuggest } from '@/helpers/recipes';
import { getSession } from '@/helpers/serverApi';
import { getRecipe } from '../getRecipe';
import { SuggestChangesForm } from './SuggestChangesForm';

type PageProps = { params: Promise<{ id: string }> };

export async function generateMetadata({ params }: PageProps) {
  const { recipe } = await getRecipe((await params).id, true);
  return { title: `Suggest changes to ${recipe.title}` };
}

export default async function SuggestChangesPage({ params }: PageProps) {
  const { id } = await params;
  // The author's version, so the suggestion changes their recipe rather than the user's own edit
  const [{ recipe }, { userId }] = await Promise.all([getRecipe(id, true), getSession()]);

  // Anyone who can't suggest changes, such as the author, is sent to the recipe itself
  if (!canSuggest(recipe, userId)) {
    redirect(recipePath(recipe.id));
  }

  return (
    <Container size="md" px={0}>
      <div className={styles.Header}>
        <BackButton href={recipePath(recipe.id)} />
        <Title ta="center">Suggest Changes</Title>
      </div>
      <Container size="sm" px={0} mt="lg" mb="xl">
        <SuggestChangesForm recipe={recipe} />
      </Container>
    </Container>
  );
}
