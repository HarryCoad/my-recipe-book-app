'use client';

import { DragEvent, FormEvent, useRef, useState } from 'react';
import { IconAlertCircle, IconLink, IconPhoto, IconUpload } from '@tabler/icons-react';
import {
  Alert,
  Button,
  FileInput,
  Group,
  Paper,
  Tabs,
  Text,
  TextInput,
  Title,
} from '@mantine/core';
import axios from '@/helpers/axios';
import { endpoints } from '@/helpers/endpoints';
import { getErrorMessage } from '@/helpers/errors';
import { ImportResponse } from '@/types/recipe';

// The API's limits for photos
export const IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
export const MAX_IMAGE_BYTES = 5 * 1024 * 1024;

export type ImportSource = 'url' | 'image';
export type ImportResult = ImportResponse['data'];

// A full web address. Typing "example.com/pancakes" is common, so https:// is added if it's
// missing. Null if it still isn't an http(s) address
export const toImportUrl = (text: string) => {
  const trimmed = text.trim();
  if (!trimmed) {
    return null;
  }
  const withScheme = /^[a-z][a-z\d+.-]*:/i.test(trimmed) ? trimmed : `https://${trimmed}`;
  try {
    const url = new URL(withScheme);
    return ['http:', 'https:'].includes(url.protocol) && url.hostname.includes('.')
      ? url.toString()
      : null;
  } catch {
    return null;
  }
};

// Why a photo can't be used, before uploading it, or null if it's fine
export const checkImage = (file: File) => {
  if (!IMAGE_TYPES.includes(file.type)) {
    return 'Please choose a JPEG, PNG, GIF or WebP image.';
  }
  if (file.size > MAX_IMAGE_BYTES) {
    return 'That image is too big. Please use one under 5 MB.';
  }
  return null;
};

type ImportRecipeProps = {
  // Chosen from My Recipes' import menu. The address box takes focus for a website
  initialSource?: ImportSource;
  onImport: (result: ImportResult) => void;
};

// Reads a recipe from a web page or a photo into a draft for the form below. Nothing is saved:
// the user checks the draft and creates the recipe as usual
export function ImportRecipe({ initialSource, onImport }: ImportRecipeProps) {
  const [source, setSource] = useState<ImportSource>(initialSource ?? 'url');
  const [url, setUrl] = useState('');
  const [image, setImage] = useState<File | null>(null);
  const [importing, setImporting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dragging, setDragging] = useState(false);
  const request = useRef<AbortController | null>(null);

  const run = async (send: (signal: AbortSignal) => Promise<{ data: ImportResponse }>) => {
    const controller = new AbortController();
    request.current = controller;
    setImporting(true);
    setError(null);
    try {
      const res = await send(controller.signal);
      onImport(res.data.data);
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
    run((signal) =>
      axios.post<ImportResponse>(endpoints.recipes.importUrl, { url: full }, { signal })
    );
  };

  const importImage = (event: FormEvent) => {
    event.preventDefault();
    if (!image) {
      setError('Please choose a photo of a recipe.');
      return;
    }
    const problem = checkImage(image);
    if (problem) {
      setError(problem);
      return;
    }
    const form = new FormData();
    form.append('image', image);
    run((signal) =>
      axios.post<ImportResponse>(endpoints.recipes.importImage, form, {
        // The shared instance sends JSON, which would turn the form data into JSON too
        headers: { 'Content-Type': 'multipart/form-data' },
        signal,
      })
    );
  };

  const cancel = () => {
    request.current?.abort();
    request.current = null;
    setImporting(false);
  };

  const chooseImage = (file: File | null) => {
    setImage(file);
    setError(file && checkImage(file));
  };

  // A photo can be dropped anywhere on the panel
  const handleDrop = (event: DragEvent) => {
    event.preventDefault();
    setDragging(false);
    const file = event.dataTransfer.files[0];
    if (file && !importing) {
      setSource('image');
      chooseImage(file);
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
      <Title order={2} size="h4">
        Import a recipe
      </Title>
      <Text size="sm" c="dimmed" mb="sm">
        Fill in the form from a website or a photo of a recipe. You can check and change everything
        before you create it.
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
            From a photo
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
          <form onSubmit={importImage} noValidate>
            <Group align="flex-end" gap="sm">
              <FileInput
                label="Photo of a recipe"
                description="JPEG, PNG, GIF or WebP, up to 5 MB. You can also drop it here."
                placeholder="Choose a photo"
                accept={IMAGE_TYPES.join(',')}
                leftSection={<IconUpload size={16} />}
                clearable
                style={{ flex: 1, minWidth: 220 }}
                value={image}
                onChange={chooseImage}
                disabled={importing}
              />
              <ImportButton importing={importing} onCancel={cancel} />
            </Group>
          </form>
        </Tabs.Panel>
      </Tabs>

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
