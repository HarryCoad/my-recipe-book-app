import styles from '../../recipes/[id]/myRecipe.module.scss';
import { Container, Title } from '@mantine/core';
import BackButton from '@/components/BackButton/BackButton';
import { CreateRecipeForm } from './CreateRecipeForm';
import { ImportSource } from './ImportRecipe';

type PageProps = {
  // ?import=url or ?import=image opens that way of importing, from My Recipes' import menu
  searchParams: Promise<{ import?: string }>;
};

export const metadata = { title: 'Create Recipe' };

const NewRecipe = async ({ searchParams }: PageProps) => {
  const from = (await searchParams).import;
  const importFrom: ImportSource | undefined =
    from === 'url' || from === 'image' ? from : undefined;

  return (
    <Container size="md" px={0}>
      <div className={styles.Header}>
        <BackButton />
        <Title ta="center">Create Recipe</Title>
      </div>
      <Container size="sm" px={0} mt="lg" mb="xl">
        <CreateRecipeForm importFrom={importFrom} />
      </Container>
    </Container>
  );
};

export default NewRecipe;
