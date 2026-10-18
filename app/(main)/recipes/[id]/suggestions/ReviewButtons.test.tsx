import { AxiosError, AxiosHeaders, AxiosResponse } from 'axios';
import { notifications } from '@mantine/notifications';
import axios from '@/helpers/axios';
import { render, screen, userEvent, waitFor } from '@/test-utils';
import { ReviewButtons } from './ReviewButtons';

const refresh = jest.fn();
jest.mock('next/navigation', () => ({ useRouter: () => ({ refresh }) }));
jest.mock('@/helpers/axios', () => ({
  __esModule: true,
  ...jest.requireActual('@/helpers/axios'),
  default: { post: jest.fn() },
}));
const post = axios.post as jest.Mock;
jest.mock('@mantine/notifications', () => ({ notifications: { show: jest.fn() } }));
const showToast = notifications.show as jest.Mock;

describe('Review buttons', () => {
  beforeEach(() => jest.clearAllMocks());

  it.each([
    ['Accept', true, 'Suggestion accepted. Your recipe has been updated.'],
    ['Reject', false, 'Suggestion rejected.'],
  ])('%s reviews the suggestion and refreshes the page', async (button, bAccept, message) => {
    post.mockResolvedValue({ data: { status: 1, data: {} } });
    render(<ReviewButtons id="s1" />);

    await userEvent.click(screen.getByRole('button', { name: button }));

    await waitFor(() => expect(refresh).toHaveBeenCalled());
    expect(post).toHaveBeenCalledWith('/api/v1/recipes/review-suggestion', { id: 's1', bAccept });
    expect(showToast).toHaveBeenCalledWith(expect.objectContaining({ message }));
  });

  it('refreshes to show where things stand when it was already reviewed', async () => {
    post.mockRejectedValue(
      new AxiosError('Request failed', 'ERR_BAD_REQUEST', undefined, undefined, {
        status: 400,
        data: { status: 0, message: 'SUGGESTION_ALREADY_REVIEWED' },
        statusText: '',
        headers: {},
        config: { headers: new AxiosHeaders() },
      } as AxiosResponse)
    );
    render(<ReviewButtons id="s1" />);

    await userEvent.click(screen.getByRole('button', { name: 'Accept' }));

    await waitFor(() => expect(refresh).toHaveBeenCalled());
    expect(showToast).toHaveBeenCalledWith(
      expect.objectContaining({
        color: 'red',
        message: 'This suggestion has already been reviewed.',
      })
    );
  });
});
