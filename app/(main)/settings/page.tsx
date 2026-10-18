import Link from 'next/link';
import { Anchor, Container, Paper, Stack, Text, Title } from '@mantine/core';
import { userPath } from '@/helpers/constants';
import { endpoints } from '@/helpers/endpoints';
import { serverGet } from '@/helpers/serverApi';
import { UserDetailsResponse } from '@/types/user';
import { PrivateSavesSwitch } from './PrivateSavesSwitch';

export const metadata = { title: 'Settings' };

// The user's account settings. Read fresh each time, so it shows what's saved
export default async function SettingsPage() {
  const { data: user } = await serverGet<UserDetailsResponse>(endpoints.users.me);

  return (
    <Container size="sm" px={0} pb="xl">
      <Title ta="center">Settings</Title>

      <Paper withBorder p="lg" radius="md" mt="lg">
        <Stack>
          <div>
            <Title order={2} size="h4">
              Privacy
            </Title>
            <Text size="sm" c="dimmed">
              Signed in as{' '}
              <Anchor component={Link} href={userPath(user.id)} size="sm">
                {user.username}
              </Anchor>
            </Text>
          </div>
          <PrivateSavesSwitch bPrivateSaves={user.bPrivateSaves} />
        </Stack>
      </Paper>
    </Container>
  );
}
