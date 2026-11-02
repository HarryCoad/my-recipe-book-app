'use client';

import { IconCamera } from '@tabler/icons-react';
import { Button, ButtonProps, FileButton } from '@mantine/core';
import { useMediaQuery } from '@mantine/hooks';
import { IMAGE_TYPES } from '@/helpers/imports';

type TakePhotoButtonProps = Omit<ButtonProps, 'onChange'> & {
  onCapture: (photo: File) => void;
  disabled?: boolean;
};

// Opens the phone's back camera to photograph a recipe. Only shown on touch screens: elsewhere it
// would just open the same file picker as choosing photos. It's separate from choosing photos
// because asking for the camera stops some phones offering their photo library
export function TakePhotoButton({ onCapture, disabled, ...props }: TakePhotoButtonProps) {
  // Not known on the server, so it appears once the page has loaded
  const touchScreen = useMediaQuery('(pointer: coarse)');
  if (!touchScreen) {
    return null;
  }

  return (
    <FileButton
      accept={IMAGE_TYPES.join(',')}
      capture="environment"
      onChange={(photo) => photo && onCapture(photo)}
      disabled={disabled}
    >
      {(fileButtonProps) => (
        <Button
          variant="light"
          color="orange"
          leftSection={<IconCamera size={16} />}
          {...props}
          {...fileButtonProps}
          disabled={disabled}
        >
          Take a photo
        </Button>
      )}
    </FileButton>
  );
}
