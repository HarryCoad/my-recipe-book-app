'use client';

import { IconTrash } from '@tabler/icons-react';
import { ActionIcon, Badge, Checkbox, Group, Stack, Text } from '@mantine/core';
import {
  canCombine,
  checkImage,
  ChosenPhoto,
  MAX_IMAGES_PER_RECIPE,
  recipeNumbers,
} from '@/helpers/imports';

type PhotoListProps = {
  photos: ChosenPhoto[];
  onChange: (photos: ChosenPhoto[]) => void;
};

const formatSize = (bytes: number) =>
  bytes >= 1024 * 1024 ? `${(bytes / 1024 / 1024).toFixed(1)} MB` : `${Math.ceil(bytes / 1024)} KB`;

// The chosen photos, in the order chosen. Each is its own recipe, unless it's ticked to go with
// the photo above, for a recipe across pages
export function PhotoList({ photos, onChange }: PhotoListProps) {
  const numbers = recipeNumbers(photos);

  const update = (id: string, changes: Partial<ChosenPhoto>) =>
    onChange(photos.map((photo) => (photo.id === id ? { ...photo, ...changes } : photo)));

  return (
    <Stack gap={0} component="ol" p={0} m={0} style={{ listStyle: 'none' }}>
      {photos.map((photo, i) => {
        const problem = checkImage(photo.file);
        const recipe = numbers[i];
        // The first photo of each recipe starts a new block
        const startsRecipe = recipe !== null && numbers.indexOf(recipe) === i;
        return (
          <Group
            component="li"
            key={photo.id}
            justify="space-between"
            wrap="nowrap"
            gap="sm"
            py={6}
            style={{
              borderTop:
                startsRecipe && i > 0 ? '1px solid var(--mantine-color-default-border)' : undefined,
            }}
          >
            <Group gap="sm" wrap="nowrap" style={{ minWidth: 0 }}>
              <Badge
                variant={recipe === null ? 'outline' : 'light'}
                color={recipe === null ? 'red' : 'orange'}
                w={90}
              >
                {recipe === null ? 'Skipped' : `Recipe ${recipe + 1}`}
              </Badge>
              <div style={{ minWidth: 0 }}>
                <Text size="sm" truncate>
                  {photo.file.name}
                </Text>
                <Text size="xs" c={problem ? 'red' : 'dimmed'}>
                  {problem ?? formatSize(photo.file.size)}
                </Text>
              </div>
            </Group>
            <Group gap="xs" wrap="nowrap">
              {i > 0 && (
                <Checkbox
                  size="xs"
                  label="Same recipe as above"
                  checked={photo.combine && canCombine(photos, i)}
                  disabled={!canCombine(photos, i) && !photo.combine}
                  title={
                    canCombine(photos, i)
                      ? undefined
                      : `A recipe can have up to ${MAX_IMAGES_PER_RECIPE} photos`
                  }
                  onChange={(event) => update(photo.id, { combine: event.currentTarget.checked })}
                />
              )}
              <ActionIcon
                variant="subtle"
                color="red"
                aria-label={`Remove ${photo.file.name}`}
                onClick={() => onChange(photos.filter((other) => other.id !== photo.id))}
              >
                <IconTrash size={16} />
              </ActionIcon>
            </Group>
          </Group>
        );
      })}
    </Stack>
  );
}
