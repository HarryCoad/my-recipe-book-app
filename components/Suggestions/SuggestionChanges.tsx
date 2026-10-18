import { IconMinus, IconPlus } from '@tabler/icons-react';
import { Badge, Box, Group, Stack, Text, Title, VisuallyHidden } from '@mantine/core';
import { DiffLine, hasChanges } from '@/helpers/diff';
import { Edit, Recipe } from '@/types/recipe';
import { HEADING_PREFIX, suggestionDiff } from './suggestions';

type SuggestionChangesProps = {
  recipe: Pick<Recipe, 'ingredients' | 'steps' | 'tags'>;
  suggestion: Pick<Edit, 'ingredients' | 'steps' | 'tags'>;
};

// What accepting the suggestion would change in the recipe as it is now: added lines in green,
// removed ones in red and struck through, unchanged ones dimmed for context
export function SuggestionChanges({ recipe, suggestion }: SuggestionChangesProps) {
  const diff = suggestionDiff(recipe, suggestion);
  const tagsChanged = !!diff.tags && (diff.tags.added.length > 0 || diff.tags.removed.length > 0);

  return (
    <Stack gap="md">
      {diff.ingredients && <DiffSection title="Ingredients" lines={diff.ingredients} />}
      {diff.steps && <DiffSection title="Method" lines={diff.steps} />}
      {diff.tags && (
        <section>
          <Title order={4} size="h5" mb={6}>
            Tags
          </Title>
          {tagsChanged ? (
            <Group gap={6}>
              {diff.tags.removed.map((tag) => (
                <Badge key={tag} color="red" variant="light" tt="none" td="line-through">
                  <VisuallyHidden>{ROW_STYLES.removed.label}</VisuallyHidden>
                  {tag}
                </Badge>
              ))}
              {diff.tags.added.map((tag) => (
                <Badge key={tag} color="green" variant="light" tt="none">
                  <VisuallyHidden>{ROW_STYLES.added.label}</VisuallyHidden>
                  {tag}
                </Badge>
              ))}
              {diff.tags.kept.map((tag) => (
                <Badge key={tag} color="gray" variant="outline" tt="none">
                  {tag}
                </Badge>
              ))}
            </Group>
          ) : (
            <Unchanged />
          )}
        </section>
      )}
    </Stack>
  );
}

function DiffSection({ title, lines }: { title: string; lines: DiffLine[] }) {
  return (
    <section>
      <Title order={4} size="h5" mb={6}>
        {title}
      </Title>
      {hasChanges(lines) ? (
        <Stack gap={2} component="ul" p={0} m={0} style={{ listStyle: 'none' }}>
          {lines.map((line, i) => (
            <DiffRow key={i} line={line} />
          ))}
        </Stack>
      ) : (
        <Unchanged />
      )}
    </section>
  );
}

const ROW_STYLES = {
  added: { color: 'green', icon: <IconPlus size={14} />, label: 'Added: ' },
  removed: { color: 'red', icon: <IconMinus size={14} />, label: 'Removed: ' },
  same: { color: undefined, icon: null, label: '' },
} as const;

function DiffRow({ line }: { line: DiffLine }) {
  const { color, icon, label } = ROW_STYLES[line.type];
  const heading = line.text.startsWith(HEADING_PREFIX);
  const text = heading ? line.text.slice(HEADING_PREFIX.length) : line.text;

  return (
    <Box
      component="li"
      px="xs"
      py={2}
      bg={color ? `var(--mantine-color-${color}-light)` : undefined}
      style={{ borderRadius: 'var(--mantine-radius-sm)' }}
    >
      <Group gap={6} wrap="nowrap" align="flex-start">
        <Box w={14} c={color} pt={3} aria-hidden>
          {icon}
        </Box>
        <Text
          size="sm"
          c={color ?? 'dimmed'}
          fw={heading ? 700 : undefined}
          td={line.type === 'removed' ? 'line-through' : undefined}
          style={{ whiteSpace: 'pre-line' }}
        >
          {/* The colours and icons aren't read out, so say what changed */}
          {label && <VisuallyHidden>{label}</VisuallyHidden>}
          {text}
        </Text>
      </Group>
    </Box>
  );
}

function Unchanged() {
  return (
    <Text size="sm" c="dimmed">
      Already the same as the recipe.
    </Text>
  );
}
