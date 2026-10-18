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
  IconMessagePlus,
  IconPencil,
  IconSlice,
  IconUser,
  IconUsers,
} from '@tabler/icons-react';
import { isAxiosError } from 'axios';
import {
  ActionIcon,
  Alert,
  Anchor,
  Badge,
  Container,
  Grid,
  GridCol,
  Group,
  Indicator,
  Stack,
  Text,
  ThemeIcon,
  Title,
  Tooltip,
} from '@mantine/core';
import BackButton from '@/components/BackButton/BackButton';
import { SaveRecipeButton } from '@/components/SaveRecipeButton/SaveRecipeButton';
import {
  recipePath,
  reviewSuggestionsPath,
  Routes,
  suggestPath,
  userPath,
} from '@/helpers/constants';
import { convertMinutesToHoursAndMinutes } from '@/helpers/convertMin';
import { canSuggest } from '@/helpers/recipes';
import { getSession } from '@/helpers/serverApi';
import { DeleteRecipeButton } from './DeleteRecipeButton';
import { getRecipe } from './getRecipe';
import { getSuggestions } from './getSuggestions';
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

  const recipeHref = recipePath(recipe.id);
  const isAuthor = recipe.authorId === userId;
  // The author deleted it, but it's kept for the people who saved it
  const orphaned = recipe.authorName === null;
  // Shown on the author's review button. The recipe still shows if they can't be loaded
  const pendingSuggestions = isAuthor
    ? await getSuggestions(recipe.id)
        .then((suggestions) => suggestions.length)
        .catch((err) => {
          if (isAxiosError(err)) {
            return 0;
          }
          throw err;
        })
    : 0;

  return (
    <Container size="lg" px={0} pb="xl">
      <div className={styles.Header}>
        <BackButton />
        <Title ta="center">{recipe.title}</Title>
        {!isAuthor && (
          <Group justify="flex-end" gap="xs" wrap="nowrap">
            {canSuggest(recipe, userId) ? (
              <Tooltip label="Suggest changes">
                <ActionIcon
                  component={Link}
                  href={suggestPath(recipe.id)}
                  replace
                  variant="light"
                  color="orange"
                  size="lg"
                  aria-label="Suggest changes"
                >
                  <IconMessagePlus size={18} />
                </ActionIcon>
              </Tooltip>
            ) : (
              // Open to suggestions, but only from people who saved it
              recipe.bAllowSuggestions &&
              !orphaned && (
                <Tooltip label="Save this recipe to suggest changes">
                  <ActionIcon
                    variant="light"
                    color="orange"
                    size="lg"
                    aria-label="Suggest changes"
                    aria-disabled
                    data-disabled
                  >
                    <IconMessagePlus size={18} />
                  </ActionIcon>
                </Tooltip>
              )
            )}
            <SaveRecipeButton
              id={recipe.id}
              title={recipe.title}
              bSaved={recipe.bSaved}
              orphaned={orphaned}
              leaveTo={orphaned ? Routes.RECIPES : undefined}
            />
          </Group>
        )}
        {isAuthor && (
          <Group justify="flex-end" gap="xs" wrap="nowrap">
            <Tooltip
              label={
                pendingSuggestions > 0
                  ? `Review suggestions (${pendingSuggestions} waiting)`
                  : 'Review suggestions'
              }
            >
              <Indicator
                label={pendingSuggestions}
                disabled={pendingSuggestions === 0}
                color="red"
                size={16}
              >
                <ActionIcon
                  component={Link}
                  href={reviewSuggestionsPath(recipe.id)}
                  variant="light"
                  color="orange"
                  size="lg"
                  aria-label={
                    pendingSuggestions > 0
                      ? `Review suggestions, ${pendingSuggestions} waiting`
                      : 'Review suggestions'
                  }
                >
                  <IconMessage2 size={18} />
                </ActionIcon>
              </Indicator>
            </Tooltip>
            <Tooltip label="Edit recipe">
              {/* Editing takes the recipe's place in the history, and saving or cancelling puts
                  it back, so the history never holds both */}
              <ActionIcon
                component={Link}
                href={`${recipeHref}/edit`}
                replace
                variant="light"
                color="orange"
                size="lg"
                aria-label="Edit recipe"
              >
                <IconPencil size={18} />
              </ActionIcon>
            </Tooltip>
            <DeleteRecipeButton
              id={recipe.id}
              title={recipe.title}
              savedCount={recipe.savedCount}
            />
          </Group>
        )}
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
          // A recipe whose author deleted it has no author to show or link to
          recipe.authorId &&
          recipe.authorName && (
            <Badge
              component={Link}
              href={userPath(recipe.authorId)}
              variant="light"
              color="gray"
              leftSection={<IconUser size={12} />}
              style={{ cursor: 'pointer' }}
            >
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

      {recipe.description && (
        <Text mt="lg" maw={700} mx="auto" ta="center" style={{ whiteSpace: 'pre-line' }}>
          {recipe.description}
        </Text>
      )}

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
