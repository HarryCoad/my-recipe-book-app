'use client';

import { DragEvent, FormEvent, useRef, useState } from 'react';
import Link from 'next/link';
import {
  IconAlertCircle,
  IconCheck,
  IconCopy,
  IconLink,
  IconPhoto,
  IconStack2,
  IconUpload,
} from '@tabler/icons-react';
import {
  Alert,
  Anchor,
  Button,
  FileInput,
  Group,
  Paper,
  Stack,
  Switch,
  Tabs,
  Text,
  TextInput,
  Title,
} from '@mantine/core';
import { recipePath, Routes } from '@/helpers/constants';
import { getErrorMessage } from '@/helpers/errors';
import {
  checkImage,
  IMAGE_TYPES,
  ImportJob,
  MAX_IMAGES_PER_RECIPE,
  sendImport,
  toImportUrl,
} from '@/helpers/imports';
import { ImportDraft, ImportResult } from '@/types/recipe';

export type ImportSource = 'url' | 'image';

// An import with a draft to check in the form
export type ImportedDraft = { draft: ImportDraft; issues: ImportResult['issues'] };

type ImportRecipeProps = {
  // Chosen from My Recipes' import menu. The address box takes focus for a website
  initialSource?: ImportSource;
  // A draft to check in the form. `triedToSkip` is true when it was meant to be created straight
  // away, but came back because something needs fixing
  onImport: (result: ImportedDraft, options: { triedToSkip: boolean }) => void;
  // "Create it straight away". Held by the page, which hides the form while it's on
  skipReview: boolean;
  onSkipReviewChange: (skipReview: boolean) => void;
};

// Why these photos can't be read as one recipe, or null if they can
const checkPhotos = (photos: File[]) => {
  if (photos.length === 0) {
    return 'Please choose a photo of a recipe.';
  }
  if (photos.length > MAX_IMAGES_PER_RECIPE) {
    return `A recipe can be read from up to ${MAX_IMAGES_PER_RECIPE} photos. For more recipes, use bulk import.`;
  }
  return photos.map(checkImage).find(Boolean) ?? null;
};

// Reads a recipe from a web page, or from up to 4 photos of one recipe. By default it's a draft
// for the user to check in the form below. With "Create it straight away" on, a draft with
// nothing to fix is created instead, and the panel is ready for the next import
export function ImportRecipe({
  initialSource,
  onImport,
  skipReview,
  onSkipReviewChange,
}: ImportRecipeProps) {
  const [source, setSource] = useState<ImportSource>(initialSource ?? 'url');
  const [url, setUrl] = useState('');
  const [photos, setPhotos] = useState<File[]>([]);
  const [importing, setImporting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [created, setCreated] = useState<{ id: string; title: string } | null>(null);
  // Already in the user's book. Kept with the import, so it can be sent again anyway
  const [duplicate, setDuplicate] = useState<{
    of: { id: string; title: string };
    job: ImportJob;
  } | null>(null);
  const [dragging, setDragging] = useState(false);
  const request = useRef<AbortController | null>(null);

  const run = async (job: ImportJob, { allowDuplicate = false } = {}) => {
    const controller = new AbortController();
    request.current = controller;
    setImporting(true);
    setError(null);
    setCreated(null);
    setDuplicate(null);
    try {
      const result = await sendImport(job, {
        skipReview,
        allowDuplicate,
        signal: controller.signal,
      });
      if (result.recipe) {
        setCreated(result.recipe);
        setUrl('');
        setPhotos([]);
      } else if (result.duplicateOf) {
        setDuplicate({ of: result.duplicateOf, job });
      } else if (result.draft) {
        onImport({ draft: result.draft, issues: result.issues }, { triedToSkip: skipReview });
      }
    } catch (err) {
      if (!controller.signal.aborted) {
        setError(getErrorMessage(err));
      }
    } finally {
      if (request.current === controller) {
        request.current = null;
        setImporting(false);
      }
    }
  };

  const importUrl = (event: FormEvent) => {
    event.preventDefault();
    const full = toImportUrl(url);
    if (!full) {
      setError('Please enter the web address of a recipe, like https://example.com/pancakes.');
      return;
    }
    run({ kind: 'url', url: full });
  };

  const importPhotos = (event: FormEvent) => {
    event.preventDefault();
    const problem = checkPhotos(photos);
    if (problem) {
      setError(problem);
      return;
    }
    run({ kind: 'image', files: photos });
  };

  const cancel = () => {
    request.current?.abort();
    request.current = null;
    setImporting(false);
  };

  // In the order chosen, which is the page order
  const choosePhotos = (files: File[]) => {
    setPhotos(files);
    setError(files.length ? checkPhotos(files) : null);
  };

  // Photos can be dropped anywhere on the panel
  const handleDrop = (event: DragEvent) => {
    event.preventDefault();
    setDragging(false);
    const files = Array.from(event.dataTransfer.files);
    if (files.length && !importing) {
      setSource('image');
      choosePhotos(files);
    }
  };

  return (
    <Paper
      withBorder
      p="md"
      radius="md"
      onDragOver={(event) => {
        event.preventDefault();
        setDragging(true);
      }}
      onDragLeave={() => setDragging(false)}
      onDrop={handleDrop}
      style={{
        borderStyle: dragging ? 'dashed' : undefined,
        borderColor: dragging ? 'var(--mantine-color-orange-6)' : undefined,
      }}
    >
      <Group justify="space-between" align="flex-start" gap="xs">
        <Title order={2} size="h4">
          Import a recipe
        </Title>
        <Anchor component={Link} href={Routes.BULK_IMPORT} size="sm">
          <Group gap={4} wrap="nowrap">
            <IconStack2 size={16} aria-hidden />
            Import lots at once
          </Group>
        </Anchor>
      </Group>
      <Text size="sm" c="dimmed" mb="sm">
        {skipReview
          ? 'Add recipes from websites or photos one after another. Any that need fixing open for you to check.'
          : 'Fill in the form from a website or photos of a recipe. You can check and change everything before you create it.'}
      </Text>

      <Tabs
        value={source}
        onChange={(value) => value && setSource(value as ImportSource)}
        color="orange"
      >
        <Tabs.List>
          <Tabs.Tab value="url" leftSection={<IconLink size={16} />} disabled={importing}>
            From a website
          </Tabs.Tab>
          <Tabs.Tab value="image" leftSection={<IconPhoto size={16} />} disabled={importing}>
            From photos
          </Tabs.Tab>
        </Tabs.List>

        <Tabs.Panel value="url" pt="md">
          <form onSubmit={importUrl} noValidate>
            <Group align="flex-end" gap="sm">
              <TextInput
                label="Recipe web address"
                placeholder="https://example.com/pancakes"
                type="url"
                inputMode="url"
                autoFocus={initialSource === 'url'}
                style={{ flex: 1, minWidth: 220 }}
                value={url}
                onChange={(event) => setUrl(event.currentTarget.value)}
                disabled={importing}
              />
              <ImportButton importing={importing} onCancel={cancel} />
            </Group>
          </form>
        </Tabs.Panel>

        <Tabs.Panel value="image" pt="md">
          <form onSubmit={importPhotos} noValidate>
            <Group align="flex-end" gap="sm">
              <FileInput
                multiple
                label="Photos of one recipe"
                description={`Up to ${MAX_IMAGES_PER_RECIPE} pages, chosen in page order. JPEG, PNG, GIF or WebP, up to 5 MB each. You can also drop them here.`}
                placeholder="Choose photos"
                accept={IMAGE_TYPES.join(',')}
                leftSection={<IconUpload size={16} />}
                clearable
                style={{ flex: 1, minWidth: 220 }}
                value={photos}
                onChange={choosePhotos}
                disabled={importing}
              />
              <ImportButton importing={importing} onCancel={cancel} />
            </Group>
          </form>
        </Tabs.Panel>
      </Tabs>

      <Switch
        mt="md"
        label="Create it straight away"
        description="Skip checking it in the form. If anything needs fixing, it opens in the form instead."
        checked={skipReview}
        onChange={(event) => onSkipReviewChange(event.currentTarget.checked)}
        disabled={importing}
      />

      {importing && (
        <Text size="sm" c="dimmed" mt="sm" role="status">
          Reading the recipe. This can take up to a minute.
        </Text>
      )}
      {error && (
        <Alert color="red" icon={<IconAlertCircle />} mt="sm">
          {error}
        </Alert>
      )}
      {created && (
        <Alert color="green" icon={<IconCheck />} mt="sm">
          Created{' '}
          <Anchor component={Link} href={recipePath(created.id)} fw={600} size="sm">
            {created.title}
          </Anchor>
          . You can import another one now.
        </Alert>
      )}
      {duplicate && (
        <Alert color="blue" icon={<IconCopy />} mt="sm" title="Already in your book">
          <Stack gap="xs">
            <Text size="sm">
              You already have{' '}
              <Anchor component={Link} href={recipePath(duplicate.of.id)} fw={600} size="sm">
                {duplicate.of.title}
              </Anchor>{' '}
              from {duplicate.job.kind === 'url' ? 'this page' : 'these photos'}, so nothing was
              imported.
            </Text>
            <Group>
              <Button
                variant="default"
                size="compact-sm"
                onClick={() => run(duplicate.job, { allowDuplicate: true })}
              >
                Import anyway
              </Button>
            </Group>
          </Stack>
        </Alert>
      )}
    </Paper>
  );
}

function ImportButton({ importing, onCancel }: { importing: boolean; onCancel: () => void }) {
  return importing ? (
    <Group gap="xs">
      <Button color="orange" loading>
        Import
      </Button>
      <Button variant="default" onClick={onCancel}>
        Cancel
      </Button>
    </Group>
  ) : (
    <Button type="submit" color="orange">
      Import
    </Button>
  );
}
