import styles from '../../recipes/[id]/myRecipe.module.scss';
import { Container, Title } from '@mantine/core';
import BackButton from '@/components/BackButton/BackButton';
import { CreateRecipeForm } from './CreateRecipeForm';

const NewRecipe = () => {
  return (
    <Container size="md" px={0}>
      <div className={styles.Header}>
        <BackButton />
        <Title ta="center">Create Recipe</Title>
      </div>
      <Container size="sm" px={0} mt="lg" mb="xl">
        <CreateRecipeForm />
      </Container>
    </Container>
  );
};

export default NewRecipe;
