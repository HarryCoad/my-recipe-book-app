import styles from '../[id]/myRecipe.module.scss';
import { Text, Title } from '@mantine/core';
import BackButton from '@/components/BackButton/BackButton';

// Placeholder until the create form is built (POST /recipes/create). This static route takes priority
// over [id], so /my-recipes/new isn't treated as a recipe id.
const NewRecipe = () => {
  return (
    <>
      <div className={styles.Header}>
        <BackButton />
        <Title ta="center">New Recipe</Title>
      </div>
      <Text ta="center" c="dimmed" mt="xl">
        Creating recipes is coming soon.
      </Text>
    </>
  );
};

export default NewRecipe;
