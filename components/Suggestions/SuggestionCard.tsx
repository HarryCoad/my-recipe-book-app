import { ReactNode } from 'react';
import { Blockquote, Group, Paper, Stack, Text } from '@mantine/core';
import { Edit } from '@/types/recipe';
import { changedParts, describeParts } from './suggestions';
import { SuggestionStatusBadge } from './SuggestionStatusBadge';

type SuggestionCardProps = {
  suggestion: Pick<Edit, 'ingredients' | 'steps' | 'tags' | 'comments' | 'status'>;
  // Who made it, or which recipe it's for
  heading: ReactNode;
  // Such as the changes it makes, or buttons to review it
  children?: ReactNode;
};

// One suggestion: who or what it's for, its status, the suggester's message and what it changes
export function SuggestionCard({ suggestion, heading, children }: SuggestionCardProps) {
  const parts = changedParts(suggestion);

  return (
    <Paper component="article" withBorder p="md" radius="md">
      <Stack gap="sm">
        <Group justify="space-between" align="flex-start" gap="xs">
          <div>
            {heading}
            <Text size="sm" c="dimmed">
              {parts.length > 0 ? `Changes the ${describeParts(parts)}` : 'Changes nothing'}
            </Text>
          </div>
          <SuggestionStatusBadge status={suggestion.status} />
        </Group>
        {suggestion.comments && (
          <Blockquote color="orange" p="sm" style={{ whiteSpace: 'pre-line' }}>
            {suggestion.comments}
          </Blockquote>
        )}
        {children}
      </Stack>
    </Paper>
  );
}
