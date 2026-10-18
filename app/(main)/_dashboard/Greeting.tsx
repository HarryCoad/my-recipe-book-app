import { Text, Title } from '@mantine/core';
import { endpoints } from '@/helpers/endpoints';
import { serverGet } from '@/helpers/serverApi';
import { UserDetailsResponse } from '@/types/user';
import { loadSection } from './data';

export async function Greeting() {
  const user = await loadSection(
    async () => (await serverGet<UserDetailsResponse>(endpoints.users.me)).data
  );

  return (
    <div>
      <Title>{user ? `Welcome back, ${user.username}` : 'Welcome back'}</Title>
      <Text c="dimmed">Here's what's happening in your recipe book.</Text>
    </div>
  );
}
