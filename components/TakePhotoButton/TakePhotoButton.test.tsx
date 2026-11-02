import { render, screen, userEvent } from '@/test-utils';
import { TakePhotoButton } from './TakePhotoButton';

// jest.setup.cjs answers every media query with "no", so this says yes to a touch screen
const useTouchScreen = (touch: boolean) =>
  jest.spyOn(window, 'matchMedia').mockImplementation(
    (query) =>
      ({
        matches: touch && query === '(pointer: coarse)',
        media: query,
        addEventListener: jest.fn(),
        removeEventListener: jest.fn(),
        addListener: jest.fn(),
        removeListener: jest.fn(),
      }) as unknown as MediaQueryList
  );

const cameraInput = () => document.querySelector('input[type="file"]') as HTMLInputElement | null;

describe('Take a photo button', () => {
  afterEach(() => jest.restoreAllMocks());

  it('opens the back camera on a touch screen', async () => {
    useTouchScreen(true);
    const onCapture = jest.fn();
    render(<TakePhotoButton onCapture={onCapture} />);

    expect(screen.getByRole('button', { name: 'Take a photo' })).toBeVisible();
    expect(cameraInput()).toHaveAttribute('capture', 'environment');

    const photo = new File(['x'], 'IMG_1.jpg', { type: 'image/jpeg' });
    await userEvent.upload(cameraInput()!, photo);
    expect(onCapture).toHaveBeenCalledWith(photo);
  });

  it("isn't shown without a touch screen, where it would repeat choosing photos", () => {
    useTouchScreen(false);
    render(<TakePhotoButton onCapture={jest.fn()} />);
    expect(screen.queryByRole('button', { name: 'Take a photo' })).not.toBeInTheDocument();
  });
});
