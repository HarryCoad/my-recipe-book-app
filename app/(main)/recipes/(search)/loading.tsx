import { Center, Loader } from '@mantine/core';

// Shown under the filters while page.tsx fetches the results
export default function Loading() {
  return (
    <Center mt="xl">
      <Loader color="orange" />
    </Center>
  );
}
