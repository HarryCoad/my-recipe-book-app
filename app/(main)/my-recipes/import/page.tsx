import styles from '../../recipes/[id]/myRecipe.module.scss';
import { Container, Title } from '@mantine/core';
import BackButton from '@/components/BackButton/BackButton';
import { BulkImport } from './BulkImport';

export const metadata = { title: 'Import Recipes' };

// Left out of the /my-recipes/<id> redirect in next.config.mjs, which otherwise catches it
export default function BulkImportPage() {
  return (
    <Container size="md" px={0} pb="xl">
      <div className={styles.Header}>
        <BackButton />
        <Title ta="center">Import Recipes</Title>
      </div>
      <Container size="sm" px={0} mt="lg">
        <BulkImport />
      </Container>
    </Container>
  );
}
