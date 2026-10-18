'use client';

import { DragEvent, useState, useSyncExternalStore } from 'react';
import { IconClockPause, IconLink, IconPhoto, IconPhotoPlus } from '@tabler/icons-react';
import {
  Alert,
  Badge,
  Button,
  FileButton,
  Group,
  Paper,
  Progress,
  Stack,
  Tabs,
  Text,
  Textarea,
  Title,
} from '@mantine/core';
import { ImportQueue, isPending, progress, QueueItem } from '@/helpers/importQueue';
import {
  ChosenPhoto,
  groupPhotos,
  IMAGE_TYPES,
  ImportJob,
  MAX_IMAGES_PER_RECIPE,
  parseLinks,
  sendImport,
} from '@/helpers/imports';
import { useLeaveGuard } from '@/helpers/useLeaveGuard';
import { PhotoList } from './PhotoList';
import { QueueList } from './QueueList';
import { ReviewDraft } from './ReviewDraft';

const LEAVE_MESSAGE =
  'Leave bulk import? Recipes still importing, and drafts waiting for review, will be lost.';

let lastPhotoId = 0;

const count = (items: QueueItem[], status: QueueItem['status']) =>
  items.filter((item) => item.status === status).length;

// Imports a whole collection of recipes: many photos and links, a few at a time. Clean ones are
// created straight away. The queue only lives in this page, so leaving it asks first
export function BulkImport() {
  const [queue] = useState(() => new ImportQueue(sendImport));
  const { items, paused } = useSyncExternalStore(queue.subscribe, queue.getState, queue.getState);

  const [tab, setTab] = useState<'photos' | 'links'>('photos');
  const [photos, setPhotos] = useState<ChosenPhoto[]>([]);
  const [linkText, setLinkText] = useState('');
  const [dragging, setDragging] = useState(false);
  const [reviewingId, setReviewingId] = useState<string | null>(null);

  const photoGroups = groupPhotos(photos);
  const links = parseLinks(linkText);
  const jobs: ImportJob[] = [
    ...photoGroups.map((files) => ({ kind: 'image' as const, files })),
    ...links.urls.map((url) => ({ kind: 'url' as const, url })),
  ];

  const pending = items.filter(isPending).length;
  const toReview = items.filter((item) => item.status === 'review');
  const reviewing = toReview.find((item) => item.id === reviewingId) ?? null;
  const { done, total } = progress(items);

  useLeaveGuard(pending > 0 || toReview.length > 0, LEAVE_MESSAGE);

  // Added after the ones already chosen, in the order picked
  const addPhotos = (files: File[]) =>
    setPhotos((current) => [
      ...current,
      ...files.map((file) => ({ id: `photo-${++lastPhotoId}`, file, combine: false })),
    ]);

  const handleDrop = (event: DragEvent) => {
    event.preventDefault();
    setDragging(false);
    const files = Array.from(event.dataTransfer.files);
    if (files.length) {
      setTab('photos');
      addPhotos(files);
    }
  };

  const start = () => {
    queue.add(jobs);
    setPhotos([]);
    setLinkText('');
  };

  return (
    <Stack gap="lg">
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
          Choose recipes to import
        </Title>
        <Text size="sm" c="dimmed" mb="sm">
          Recipes are added to your book straight away, as private. Any that need fixing wait below
          for you to review.
        </Text>

        <Tabs
          value={tab}
          onChange={(value) => value && setTab(value as 'photos' | 'links')}
          color="orange"
        >
          <Tabs.List>
            <Tabs.Tab value="photos" leftSection={<IconPhoto size={16} />}>
              Photos{photos.length > 0 && ` (${photos.length})`}
            </Tabs.Tab>
            <Tabs.Tab value="links" leftSection={<IconLink size={16} />}>
              Links{links.urls.length > 0 && ` (${links.urls.length})`}
            </Tabs.Tab>
          </Tabs.List>

          <Tabs.Panel value="photos" pt="md">
            <Stack gap="sm">
              <Text size="sm" c="dimmed">
                Each photo is a recipe. For a recipe over several pages, choose its photos in page
                order and tick "Same recipe as above" on the later pages (up to{' '}
                {MAX_IMAGES_PER_RECIPE}). JPEG, PNG, GIF or WebP, up to 5 MB each.
              </Text>
              <Group gap="sm">
                <FileButton multiple accept={IMAGE_TYPES.join(',')} onChange={addPhotos}>
                  {(props) => (
                    <Button
                      {...props}
                      variant="light"
                      color="orange"
                      leftSection={<IconPhotoPlus size={16} />}
                    >
                      Choose photos
                    </Button>
                  )}
                </FileButton>
                <Text size="sm" c="dimmed">
                  or drop them here
                </Text>
                {photos.length > 0 && (
                  <Button
                    variant="subtle"
                    color="gray"
                    size="compact-sm"
                    onClick={() => setPhotos([])}
                  >
                    Clear all
                  </Button>
                )}
              </Group>
              {photos.length > 0 && <PhotoList photos={photos} onChange={setPhotos} />}
            </Stack>
          </Tabs.Panel>

          <Tabs.Panel value="links" pt="md">
            <Textarea
              label="Recipe web addresses"
              description="One per line. Blank lines and repeats are left out."
              placeholder={'https://example.com/pancakes\nhttps://example.com/curry'}
              autosize
              minRows={6}
              maxRows={16}
              value={linkText}
              onChange={(event) => setLinkText(event.currentTarget.value)}
            />
            {links.invalid.length > 0 && (
              <Text size="sm" c="red" mt="xs">
                {links.invalid.length === 1 ? "This line isn't" : "These lines aren't"} a web
                address, so {links.invalid.length === 1 ? "it'll" : "they'll"} be left out:{' '}
                {links.invalid.join(', ')}
              </Text>
            )}
          </Tabs.Panel>
        </Tabs>

        <Group justify="space-between" mt="md">
          <Text size="sm" c="dimmed">
            {jobs.length === 0
              ? 'Nothing chosen yet.'
              : `${photoGroups.length} from photos and ${links.urls.length} from links.`}
          </Text>
          <Button color="orange" disabled={jobs.length === 0} onClick={start}>
            {jobs.length === 1 ? 'Import 1 recipe' : `Import ${jobs.length} recipes`}
          </Button>
        </Group>
      </Paper>

      {paused && (
        <Alert color="yellow" icon={<IconClockPause />} title="Paused at the hourly limit">
          <Stack gap="xs">
            <Text size="sm">
              You can import up to 100 recipes an hour. The rest are waiting, and nothing has been
              lost. Resume once the hour is up.
            </Text>
            <Group>
              <Button size="compact-sm" color="orange" onClick={() => queue.resume()}>
                Resume
              </Button>
            </Group>
          </Stack>
        </Alert>
      )}

      {reviewing && (
        <ReviewDraft
          item={reviewing}
          onCreated={(recipe) => {
            queue.markAdded(reviewing.id, recipe);
            setReviewingId(null);
          }}
          onClose={() => setReviewingId(null)}
        />
      )}

      {toReview.length > 0 && (
        <Paper withBorder p="md" radius="md">
          <Title order={2} size="h4">
            Waiting for your review ({toReview.length})
          </Title>
          <Text size="sm" c="dimmed" mb="xs">
            These were read, but something needs fixing before they can be added.
          </Text>
          <QueueList items={toReview} queue={queue} onReview={setReviewingId} />
        </Paper>
      )}

      {total > 0 && (
        <Paper withBorder p="md" radius="md">
          <Group justify="space-between" mb="xs">
            <Title order={2} size="h4">
              Import progress
            </Title>
            <Text size="sm" fw={600} role="status">
              {done} of {total}
            </Text>
          </Group>
          <Progress
            value={(done / total) * 100}
            color={paused ? 'yellow' : 'orange'}
            aria-label={`${done} of ${total} imported`}
            mb="sm"
          />
          <Group justify="space-between" mb="xs">
            <Group gap="xs">
              <Badge color="green" variant="light">
                {count(items, 'added')} added
              </Badge>
              <Badge color="yellow" variant="light">
                {toReview.length} to review
              </Badge>
              <Badge color="blue" variant="light">
                {count(items, 'duplicate')} already in your book
              </Badge>
              <Badge color="red" variant="light">
                {count(items, 'failed')} failed
              </Badge>
            </Group>
            {count(items, 'queued') > 0 && (
              <Button
                size="compact-sm"
                variant="subtle"
                color="red"
                onClick={() => queue.cancelRest()}
              >
                Cancel the rest
              </Button>
            )}
          </Group>
          <QueueList items={items} queue={queue} onReview={setReviewingId} />
        </Paper>
      )}
    </Stack>
  );
}
