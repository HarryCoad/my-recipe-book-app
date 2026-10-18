import { redirect } from 'next/navigation';
import styles from '../myRecipe.module.scss';
import { Container, Title } from '@mantine/core';
import BackButton from '@/components/BackButton/BackButton';
import { recipePath } from '@/helpers/constants';
import { getSession } from '@/helpers/serverApi';
import { getRecipe } from '../getRecipe';
import { EditRecipeForm } from './EditRecipeForm';

type PageProps = { params: Promise<{ id: string }> };

export async function generateMetadata({ params }: PageProps) {
  const { recipe } = await getRecipe((await params).id);
  return { title: `Edit ${recipe.title}` };
}

export default async function EditRecipePage({ params }: PageProps) {
  const { id } = await params;
  const [{ recipe }, { userId }] = await Promise.all([getRecipe(id), getSession()]);

  // Only the author can change it. A recipe whose author deleted it has no authorId, so it's
  // never editable. Anyone else is sent to the recipe itself.
  if (recipe.authorId !== userId) {
    redirect(recipePath(recipe.id));
  }

  return (
    <Container size="md" px={0}>
      <div className={styles.Header}>
        <BackButton href={recipePath(recipe.id)} />
        <Title ta="center">Edit Recipe</Title>
      </div>
      <Container size="sm" px={0} mt="lg" mb="xl">
        <EditRecipeForm recipe={recipe} />
      </Container>
    </Container>
  );
}
