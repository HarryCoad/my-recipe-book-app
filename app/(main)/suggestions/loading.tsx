import { Center, Loader } from '@mantine/core';

// Shown while page.tsx fetches the suggestions on the server
export default function Loading() {
  return (
    <Center mt="xl">
      <Loader color="orange" />
    </Center>
  );
}
