import { render as testingLibraryRender } from '@testing-library/react';
import { MantineProvider } from '@mantine/core';
import { theme } from '../theme';

export function render(ui: React.ReactNode) {
  return testingLibraryRender(<>{ui}</>, {
    wrapper: ({ children }: { children: React.ReactNode }) => (
      // env="test" turns off transitions and portals, so dropdowns open instantly and in place
      <MantineProvider theme={theme} env="test">
        {children}
      </MantineProvider>
    ),
  });
}
