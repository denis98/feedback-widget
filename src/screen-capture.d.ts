// Type augmentations for Screen Capture API features not yet in lib.dom.d.ts

interface DisplayMediaStreamOptions {
  preferCurrentTab?: boolean;
}

interface MediaTrackConstraintSet {
  displaySurface?: 'browser' | 'monitor' | 'window';
}

// ImageCapture.grabFrame is not yet in all TypeScript DOM lib versions
interface ImageCapture {
  grabFrame(): Promise<ImageBitmap>;
}
