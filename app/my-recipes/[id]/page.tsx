import styles from './myRecipe.module.scss';
import { Text, Title } from '@mantine/core';
import BackButton from '@/components/BackButton/BackButton';

interface PageProps {
  params: Promise<{
    id: string;
  }>;
}
const MyRecipe = async ({ params }: PageProps) => {
  const { id } = await params;
  // const res = await fetch(`https://api.example.com/recipes/${id}`);
  //   const recipe: Recipe = await res.json();

  return (
    <>
      <div className={styles.Header}>
        <BackButton />
        <Title className="" ta="center">
          My Recipe:
        </Title>
      </div>
      <Text>Recipe id: {id}</Text>
    </>
  );
};

export default MyRecipe;
