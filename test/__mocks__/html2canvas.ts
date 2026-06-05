// Stub for html2canvas (optional peer dependency) in test environment
const html2canvas = async (_element: HTMLElement): Promise<HTMLCanvasElement> => {
  const canvas = document.createElement('canvas');
  canvas.toDataURL = () => 'data:image/png;base64,STUB';
  return canvas;
};

export default html2canvas;
