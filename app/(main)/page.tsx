import { Suspense } from 'react';
import { Container, Divider, SimpleGrid, Skeleton, Stack, Title } from '@mantine/core';
import { Routes } from '@/helpers/constants';
import { AtAGlance } from './_dashboard/AtAGlance';
import { Greeting } from './_dashboard/Greeting';
import { QuickActions } from './_dashboard/QuickActions';
import { RecipeShelf } from './_dashboard/RecipeShelf';

export const metadata = { title: 'Dashboard' };

// Each part loads on its own and shows as soon as it's ready, so a slow one doesn't hold up the
// rest. The quick actions need no data, so they show straight away
export default function DashboardPage() {
  return (
    <Container size="lg" px={0} pb="xl">
      <Stack gap="xl">
        <Suspense fallback={<Title>Welcome back</Title>}>
          <Greeting />
        </Suspense>

        <QuickActions />

        <section>
          <Title order={2} size="h3" mb="sm">
            At a glance
          </Title>
          <Suspense fallback={<CardsSkeleton count={4} height={96} />}>
            <AtAGlance />
          </Suspense>
        </section>

        <Divider />

        <Suspense fallback={<ShelfSkeleton />}>
          <RecipeShelf
            title="Popular recipes to try"
            search={{ sort: 'popular' }}
            seeAllHref={`${Routes.RECIPES}?bHideSaved=true&sort=popular`}
            empty="You've saved every popular recipe. Check back later for more."
          />
        </Suspense>

        <Suspense fallback={<ShelfSkeleton />}>
          <RecipeShelf
            title="New recipes"
            search={{ sort: 'newest' }}
            seeAllHref={`${Routes.RECIPES}?bHideSaved=true`}
            empty="Nothing new since you last looked."
          />
        </Suspense>
      </Stack>
    </Container>
  );
}

function CardsSkeleton({ count, height }: { count: number; height: number }) {
  return (
    <SimpleGrid cols={{ base: 1, xs: 2, md: 4 }} spacing="sm">
      {Array.from({ length: count }, (_, i) => (
        <Skeleton key={i} height={height} radius="md" />
      ))}
    </SimpleGrid>
  );
}

function ShelfSkeleton() {
  return (
    <Stack gap="sm">
      <Skeleton height={28} width={240} />
      <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="sm">
        {Array.from({ length: 4 }, (_, i) => (
          <Skeleton key={i} height={104} radius="md" />
        ))}
      </SimpleGrid>
    </Stack>
  );
}
