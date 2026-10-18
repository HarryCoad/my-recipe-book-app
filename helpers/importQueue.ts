import { isAxiosError } from 'axios';
import { getErrorCode, getErrorMessage } from '@/helpers/errors';
import { ImportJob, ImportOptions } from '@/helpers/imports';
import { ImportDraft, ImportResult } from '@/types/recipe';

// Imports many recipes one request each, a few at a time, since there's no bulk endpoint. Kept
// apart from React so the queue's rules can be tested on their own: see useImportQueue for the
// page's side

export type ItemStatus =
  | 'queued'
  | 'importing'
  // Created straight away
  | 'added'
  // Read, but something needs fixing before it can be created
  | 'review'
  // Already in the user's book, so nothing was read
  | 'duplicate'
  | 'failed'
  // Not started before the user cancelled the rest
  | 'cancelled'
  // A draft the user chose not to save
  | 'dismissed';

export type QueueItem = {
  id: string;
  job: ImportJob;
  status: ItemStatus;
  // Set when added
  recipe?: { id: string; title: string };
  // Set when it's a duplicate
  duplicateOf?: { id: string; title: string };
  // Set when it needs review
  draft?: ImportDraft;
  issues?: ImportResult['issues'];
  // Set when it failed, ready to show
  error?: string;
  // Send bAllowDuplicate, after the user chose "Import anyway"
  allowDuplicate: boolean;
  // Failures that can pass with another try are retried once by themselves
  retried: boolean;
};

export type QueueState = {
  items: QueueItem[];
  // Over the hourly import limit: nothing more starts until the user resumes
  paused: boolean;
};

export type SendImport = (job: ImportJob, options: ImportOptions) => Promise<ImportResult>;

export const MAX_RUNNING = 3;

// Worth one more try straight away: reading the recipe failed, or the request never got an answer
const isPassingFailure = (err: unknown) =>
  getErrorCode(err) === 'IMPORT_FAILED' || (isAxiosError(err) && !err.response);

const isHourlyLimit = (err: unknown) =>
  getErrorCode(err) === 'TOO_MANY_IMPORTS' || (isAxiosError(err) && err.response?.status === 429);

// Still to do, or doing
export const isPending = (item: QueueItem) =>
  item.status === 'queued' || item.status === 'importing';

let lastId = 0;

export class ImportQueue {
  private state: QueueState = { items: [], paused: false };

  private listeners = new Set<() => void>();

  constructor(
    private readonly send: SendImport,
    private readonly maxRunning = MAX_RUNNING
  ) {}

  // For useSyncExternalStore: the state is replaced, never changed, so React sees each update
  getState = () => this.state;

  subscribe = (listener: () => void) => {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  };

  // Queues recipes and starts on them straight away
  add(jobs: ImportJob[]) {
    const items: QueueItem[] = jobs.map((job) => ({
      id: `import-${++lastId}`,
      job,
      status: 'queued',
      allowDuplicate: false,
      retried: false,
    }));
    this.setState({ ...this.state, items: [...this.state.items, ...items] });
    this.pump();
  }

  // Carries on after the hourly limit
  resume() {
    this.setState({ ...this.state, paused: false });
    this.pump();
  }

  // Stops everything that hasn't started. Imports already sent are left to finish, since the
  // API could still create the recipe even if the request were abandoned
  cancelRest() {
    this.updateItems((item) =>
      item.status === 'queued' ? { ...item, status: 'cancelled' } : item
    );
  }

  // Tries a failed or cancelled recipe again
  retry(id: string) {
    this.requeue(id, (item) => item.status === 'failed' || item.status === 'cancelled', {
      retried: false,
    });
  }

  // Imports a duplicate after all
  importAnyway(id: string) {
    this.requeue(id, (item) => item.status === 'duplicate', { allowDuplicate: true });
  }

  // A reviewed draft was created through the form
  markAdded(id: string, recipe: { id: string; title: string }) {
    this.updateItem(id, (item) => ({ ...item, status: 'added', recipe }));
  }

  // A draft the user doesn't want
  dismiss(id: string) {
    this.updateItem(id, (item) =>
      item.status === 'review' ? { ...item, status: 'dismissed' } : item
    );
  }

  // Starts queued recipes, in order, while there's room and the queue isn't paused
  private pump() {
    const running = this.state.items.filter((item) => item.status === 'importing').length;
    if (this.state.paused || running >= this.maxRunning) {
      return;
    }
    const next = this.state.items.find((item) => item.status === 'queued');
    if (next) {
      this.run(next);
      this.pump();
    }
  }

  private async run(item: QueueItem) {
    this.updateItem(item.id, (current) => ({ ...current, status: 'importing', error: undefined }));
    try {
      const result = await this.send(item.job, {
        skipReview: true,
        allowDuplicate: item.allowDuplicate,
      });
      this.updateItem(item.id, (current) => ({ ...current, ...outcome(result) }));
    } catch (err) {
      this.handleError(item.id, err);
    }
    this.pump();
  }

  private handleError(id: string, err: unknown) {
    if (isHourlyLimit(err)) {
      // Not this recipe's fault: it waits its turn again, and nothing more starts for now
      this.setState({
        paused: true,
        items: this.state.items.map((item) =>
          item.id === id ? { ...item, status: 'queued' } : item
        ),
      });
      return;
    }
    const item = this.state.items.find((current) => current.id === id);
    if (item && !item.retried && isPassingFailure(err)) {
      this.updateItem(id, (current) => ({ ...current, status: 'queued', retried: true }));
      return;
    }
    this.updateItem(id, (current) => ({
      ...current,
      status: 'failed',
      error: getErrorMessage(err),
    }));
  }

  private requeue(id: string, can: (item: QueueItem) => boolean, changes: Partial<QueueItem>) {
    const item = this.state.items.find((current) => current.id === id);
    if (!item || !can(item)) {
      return;
    }
    this.updateItem(id, (current) => ({
      ...current,
      ...changes,
      status: 'queued',
      error: undefined,
    }));
    this.pump();
  }

  private updateItem(id: string, update: (item: QueueItem) => QueueItem) {
    this.updateItems((item) => (item.id === id ? update(item) : item));
  }

  private updateItems(update: (item: QueueItem) => QueueItem) {
    this.setState({ ...this.state, items: this.state.items.map(update) });
  }

  private setState(state: QueueState) {
    this.state = state;
    this.listeners.forEach((listener) => listener());
  }
}

// What an answer from the API means for its item
const outcome = (result: ImportResult): Partial<QueueItem> => {
  if (result.recipe) {
    return { status: 'added', recipe: { id: result.recipe.id, title: result.recipe.title } };
  }
  if (result.duplicateOf) {
    return { status: 'duplicate', duplicateOf: result.duplicateOf };
  }
  if (result.draft) {
    return { status: 'review', draft: result.draft, issues: result.issues };
  }
  // Shouldn't happen: the API always sends one of the three
  return { status: 'failed', error: 'Something went wrong. Please try again.' };
};

// "12 of 30": how many are finished, whatever their outcome
export const progress = (items: QueueItem[]) => ({
  done: items.filter((item) => !isPending(item)).length,
  total: items.length,
});
