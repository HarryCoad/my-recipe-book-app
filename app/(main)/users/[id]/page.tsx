import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { IconLock, IconSettings } from '@tabler/icons-react';
import { isAxiosError } from 'axios';
import { Button, Center, Container, Group, Stack, Text, ThemeIcon, Title } from '@mantine/core';
import { RecipeList } from '@/components/RecipeList/RecipeList';
import { RecipePagination } from '@/components/RecipePagination/RecipePagination';
import { Routes, userPath } from '@/helpers/constants';
import { endpoints } from '@/helpers/endpoints';
import { getErrorCode } from '@/helpers/errors';
import { getSession, serverGet } from '@/helpers/serverApi';
import { RecipeSearchResponse } from '@/types/recipe';
import { getProfile } from './getProfile';

type PageProps = {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ page?: string }>;
};

export async function generateMetadata({ params }: PageProps) {
  const user = await getProfile((await params).id);
  return { title: user.username };
}

// The recipes someone has saved, which includes the ones they wrote. Null when they've made their
// saves private, which can change after their profile loaded
const getSavedRecipes = async (id: string, page: number) => {
  try {
    return await serverGet<RecipeSearchResponse>(endpoints.recipes.search, {
      params: { savedBy: id, page },
    });
  } catch (err) {
    if (getErrorCode(err) === 'SAVES_PRIVATE') {
      return null;
    }
    // Their account was deleted after their profile loaded
    if (isAxiosError(err) && err.response?.status === 404) {
      notFound();
    }
    throw err;
  }
};

// Anyone's profile, including the user's own: their name and their saved recipes
export default async function UserProfilePage({ params, searchParams }: PageProps) {
  const { id } = await params;
  const page = Math.max(1, parseInt((await searchParams).page ?? '', 10) || 1);
  const [user, { userId }] = await Promise.all([getProfile(id), getSession()]);
  const isSelf = user.id === userId;

  // Private saves are only hidden from other people, so there's no point asking for them
  const saved = user.bPrivateSaves && !isSelf ? null : await getSavedRecipes(user.id, page);

  // Past the last page, e.g. after editing the URL
  if (saved && saved.data.length === 0 && page > 1) {
    const profile = userPath(user.id);
    redirect(saved.totalPages > 1 ? `${profile}?page=${saved.totalPages}` : profile);
  }

  return (
    <Container size="md" px={0} pb="xl">
      <Stack gap={4} align="center">
        <Title>{user.username}</Title>
        {isSelf && (
          <Group gap="xs">
            <Text c="dimmed">This is your profile, as other people see it.</Text>
            <Button
              component={Link}
              href={Routes.SETTINGS}
              variant="subtle"
              color="orange"
              size="compact-sm"
              leftSection={<IconSettings size={14} />}
            >
              Settings
            </Button>
          </Group>
        )}
      </Stack>

      <Title order={2} size="h3" mt="xl" mb="md">
        Saved recipes
      </Title>

      {isSelf && user.bPrivateSaves && (
        <Text c="dimmed" mb="md">
          Your saved recipes are private, so only you can see this list.
        </Text>
      )}

      {saved === null ? (
        <Center>
          <Stack align="center" gap="xs" mt="lg">
            <ThemeIcon variant="light" color="gray" size="xl" radius="xl">
              <IconLock size={22} />
            </ThemeIcon>
            <Text c="dimmed">This user's saved recipes are private.</Text>
          </Stack>
        </Center>
      ) : saved.data.length === 0 ? (
        <Text ta="center" c="dimmed" mt="lg">
          {isSelf
            ? "You haven't saved any recipes yet."
            : `${user.username} hasn't saved any recipes you can see yet.`}
        </Text>
      ) : (
        <>
          <RecipeList recipes={saved.data} userId={userId} />
          <RecipePagination page={page} totalPages={saved.totalPages} />
        </>
      )}
    </Container>
  );
}
