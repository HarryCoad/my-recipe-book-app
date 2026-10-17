import { ReactNode } from 'react';
import Link from 'next/link';
import styles from './myRecipe.module.scss';
import {
  IconBookmark,
  IconClock,
  IconFlame,
  IconInfoCircle,
  IconLock,
  IconMessage2,
  IconPencil,
  IconSlice,
  IconUser,
  IconUsers,
} from '@tabler/icons-react';
import {
  Alert,
  Anchor,
  Badge,
  Button,
  Container,
  Grid,
  GridCol,
  Group,
  Stack,
  Text,
  ThemeIcon,
  Title,
} from '@mantine/core';
import BackButton from '@/components/BackButton/BackButton';
import { Routes } from '@/helpers/constants';
import { convertMinutesToHoursAndMinutes } from '@/helpers/convertMin';
import { getSession } from '@/helpers/serverApi';
import { getRecipe } from './getRecipe';
import { IngredientsPanel } from './IngredientsPanel';

type PageProps = {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ original?: string }>;
};

const readParams = async ({ params, searchParams }: PageProps) => ({
  id: (await params).id,
  original: (await searchParams).original === 'true',
});

export async function generateMetadata(props: PageProps) {
  const { id, original } = await readParams(props);
  const { recipe } = await getRecipe(id, original);
  return { title: recipe.title };
}

export default async function RecipePage(props: PageProps) {
  const { id, original } = await readParams(props);
  const [{ recipe, bHasEdits }, { userId }] = await Promise.all([
    getRecipe(id, original),
    getSession(),
  ]);

  const recipeHref = `${Routes.MY_RECIPES}/${recipe.id}`;
  const isAuthor = recipe.authorId === userId;
  // The author deleted it, but it's kept for the people who saved it
  const orphaned = recipe.authorName === null;

  return (
    <Container size="lg" px={0} pb="xl">
      <div className={styles.Header}>
        <BackButton />
        <Title ta="center">{recipe.title}</Title>
      </div>

      <Group justify="center" gap="xs" mt="sm">
        <Badge variant="light" color="orange">
          {recipe.category}
        </Badge>
        {recipe.bPrivate && (
          <Badge variant="light" color="gray" leftSection={<IconLock size={12} />}>
            Private
          </Badge>
        )}
        {isAuthor ? (
          <Badge variant="light" color="blue" leftSection={<IconUser size={12} />}>
            Your recipe
          </Badge>
        ) : (
          !orphaned && (
            <Badge variant="light" color="gray" leftSection={<IconUser size={12} />}>
              By {recipe.authorName}
            </Badge>
          )
        )}
        <Badge variant="light" color="gray" leftSection={<IconBookmark size={12} />}>
          Saved by {recipe.savedCount} {recipe.savedCount === 1 ? 'person' : 'people'}
        </Badge>
        {recipe.bAllowSuggestions && !orphaned && (
          <Badge variant="light" color="teal" leftSection={<IconMessage2 size={12} />}>
            Open to suggestions
          </Badge>
        )}
      </Group>

      {isAuthor && (
        <Group justify="center" mt="md">
          {/* Editing takes the recipe's place in the history, and saving or cancelling puts it
              back, so the history never holds both */}
          <Button
            component={Link}
            href={`${recipeHref}/edit`}
            replace
            variant="light"
            color="orange"
            leftSection={<IconPencil size={16} />}
          >
            Edit recipe
          </Button>
        </Group>
      )}

      <Stack gap="sm" mt="lg" maw={700} mx="auto">
        {original && (
          <Alert color="blue" icon={<IconInfoCircle />}>
            You're viewing the original recipe, without your changes.{' '}
            <Anchor component={Link} href={recipeHref} size="sm">
              Back to your version
            </Anchor>
          </Alert>
        )}
        {bHasEdits && !original && (
          <Alert color="blue" icon={<IconInfoCircle />}>
            This includes your personal changes to the ingredients, steps or tags.{' '}
            <Anchor component={Link} href={`${recipeHref}?original=true`} size="sm">
              View the original
            </Anchor>
          </Alert>
        )}
        {orphaned && (
          <Alert color="gray" icon={<IconInfoCircle />}>
            The author has deleted this recipe. It's kept for people who saved it, but it can no
            longer be changed and suggestions are closed.
          </Alert>
        )}
      </Stack>

      <Text mt="lg" maw={700} mx="auto" ta="center" style={{ whiteSpace: 'pre-line' }}>
        {recipe.description}
      </Text>

      <Group justify="center" gap="xl" mt="lg">
        <Stat icon={<IconSlice size={18} />} label="Prep">
          {convertMinutesToHoursAndMinutes(recipe.prepTime)}
        </Stat>
        <Stat icon={<IconFlame size={18} />} label="Cook">
          {convertMinutesToHoursAndMinutes(recipe.cookTime)}
        </Stat>
        <Stat icon={<IconClock size={18} />} label="Total">
          {convertMinutesToHoursAndMinutes(recipe.prepTime + recipe.cookTime)}
        </Stat>
        <Stat icon={<IconUsers size={18} />} label="Serves">
          {recipe.serves}
        </Stat>
      </Group>

      {recipe.tags.length > 0 && (
        <Group gap="xs" mt="sm">
          {recipe.tags.map((tag) => (
            <Badge key={tag} variant="outline" color="gray" tt="none">
              {tag}
            </Badge>
          ))}
        </Group>
      )}

      <Grid mt="sm" gutter="xl">
        <GridCol span={{ base: 12, md: 5 }}>
          <IngredientsPanel ingredients={recipe.ingredients} serves={recipe.serves} />
        </GridCol>

        <GridCol span={{ base: 12, md: 7 }}>
          <Title order={3} mb="md" id="method-heading">
            Method
          </Title>
          <Stack
            component="ol"
            aria-labelledby="method-heading"
            gap="lg"
            p={0}
            m={0}
            style={{ listStyle: 'none' }}
          >
            {recipe.steps.map((step, i) => (
              <Group component="li" key={i} align="flex-start" wrap="nowrap" gap="md">
                <ThemeIcon variant="light" color="orange" radius="xl" size="lg" aria-hidden>
                  {i + 1}
                </ThemeIcon>
                <Text pt={4} style={{ whiteSpace: 'pre-line' }}>
                  <span className={styles.visuallyHidden}>Step {i + 1}: </span>
                  {step}
                </Text>
              </Group>
            ))}
          </Stack>
        </GridCol>
      </Grid>
    </Container>
  );
}

function Stat({ icon, label, children }: { icon: ReactNode; label: string; children: ReactNode }) {
  return (
    <Stack gap={2} align="center">
      <Group gap={6} c="dimmed">
        {icon}
        <Text size="xs" tt="uppercase" fw={600}>
          {label}
        </Text>
      </Group>
      <Text fw={600}>{children}</Text>
    </Stack>
  );
}
