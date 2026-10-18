import { render as testingLibraryRender } from '@testing-library/react';
import { Collapse, MantineProvider, mergeThemeOverrides } from '@mantine/core';
import { theme } from '../theme';

// jsdom never fires transitionend, so a Collapse would never finish opening
const testTheme = mergeThemeOverrides(theme, {
  components: { Collapse: Collapse.extend({ defaultProps: { transitionDuration: 0 } }) },
});

export function render(ui: React.ReactNode) {
  return testingLibraryRender(<>{ui}</>, {
    wrapper: ({ children }: { children: React.ReactNode }) => (
      // env="test" turns off transitions and portals, so dropdowns open instantly and in place
      <MantineProvider theme={testTheme} env="test">
        {children}
      </MantineProvider>
    ),
  });
}
