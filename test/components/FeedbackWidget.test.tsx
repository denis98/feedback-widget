import React from 'react';
import { describe, test, expect, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { FeedbackProvider } from '../../src/components/FeedbackProvider.js';

// jsdom cannot decode images; the PNG conversion itself is a browser concern.
vi.mock('../../src/utils/screenshot.js', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../../src/utils/screenshot.js')>()),
  blobToPngDataUrl: vi.fn(async () => 'data:image/png;base64,UEFTVEVE'),
}));

/** Dispatches a paste event carrying an image (and optional text) at `target`. */
function pasteImage(target: EventTarget, text = '') {
  const file = new File(['x'], 'shot.png', { type: 'image/png' });
  const event = new Event('paste', { bubbles: true, cancelable: true });
  Object.defineProperty(event, 'clipboardData', {
    value: {
      items: [{ kind: 'file', type: file.type, getAsFile: () => file }],
      getData: (t: string) => (t === 'text/plain' ? text : ''),
    },
  });
  target.dispatchEvent(event);
  return event;
}

function renderWidget(props: Partial<Parameters<typeof FeedbackProvider>[0]> = {}) {
  return render(
    <FeedbackProvider webhookUrl="http://test/webhook" {...props}>
      <div>App Content</div>
    </FeedbackProvider>,
  );
}

/**
 * Hovers the floating trigger (which replaces it with the type container) and
 * picks a feedback type, entering the selection phase.
 */
async function openTrigger(
  user: ReturnType<typeof userEvent.setup>,
  type: RegExp = /feedback: bug/i,
) {
  await user.hover(screen.getByRole('button', { name: /open feedback/i }));
  await user.click(await screen.findByRole('button', { name: type }));
}

/** Opens widget and navigates through selection to the form */
async function openToForm(user: ReturnType<typeof userEvent.setup>) {
  await openTrigger(user);
  // Selection bar appears → skip selection to go directly to form
  await user.click(screen.getByRole('button', { name: /skip/i }));
}

describe('FeedbackWidget', () => {
  test('modal is closed by default', () => {
    renderWidget();
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  test('picking a type from the hover container enters selection phase (no modal yet)', async () => {
    const user = userEvent.setup();
    renderWidget();

    await openTrigger(user);

    // Selection bar visible, not yet the form
    expect(screen.getByText(/select an area/i)).toBeInTheDocument();
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  test('hovering replaces the button with one container button per type', async () => {
    const user = userEvent.setup();
    renderWidget();

    await user.hover(screen.getByRole('button', { name: /open feedback/i }));

    // Pill is replaced by the type container.
    expect(screen.queryByRole('button', { name: /open feedback/i })).not.toBeInTheDocument();
    expect(screen.getByRole('group', { name: /choose feedback type/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /feedback: bug/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /feedback: feature/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /feedback: general/i })).toBeInTheDocument();
  });

  test('picking a type preselects it in the form', async () => {
    const user = userEvent.setup();
    renderWidget({ selectionMode: 'none' });

    await openTrigger(user, /feedback: feature/i);

    // Form opens with the Feature type active (its modal button is highlighted).
    const featureBtn = screen.getByRole('button', { name: /feature request/i });
    expect(featureBtn).toHaveStyle({ color: 'rgb(29, 78, 216)' });
  });

  test('skipping selection opens the form modal', async () => {
    const user = userEvent.setup();
    renderWidget();

    await openToForm(user);

    expect(screen.getByRole('dialog')).toBeInTheDocument();
  });

  test('captures a screenshot into the gallery when screenshot is enabled', async () => {
    const user = userEvent.setup();
    renderWidget({ screenshot: true });

    await openTrigger(user);
    // With screenshot on, the skip action is labelled "Ganzer Bildschirm".
    await user.click(screen.getByRole('button', { name: /whole screen/i }));

    // Capture runs in confirmSelection → falls back to modern-screenshot (mocked) in jsdom.
    const img = await waitFor(() => screen.getByAltText(/screenshot 1/i));
    expect(img).toHaveAttribute('src', expect.stringContaining('data:image/png;base64,'));

    // The form offers adding more images.
    expect(screen.getByRole('button', { name: /add image/i })).toBeInTheDocument();

    // Removing the screenshot empties the gallery.
    await user.click(screen.getByRole('button', { name: /remove screenshot 1/i }));
    expect(screen.queryByAltText(/screenshot 1/i)).not.toBeInTheDocument();
    expect(screen.getByText(/no screenshot yet/i)).toBeInTheDocument();
  });

  test('"Ohne Screenshot" opens the form without capturing', async () => {
    const user = userEvent.setup();
    renderWidget({ screenshot: true });

    await openTrigger(user);
    await user.click(screen.getByRole('button', { name: /without screenshot/i }));

    expect(screen.getByRole('dialog')).toBeInTheDocument();
    expect(screen.getByText(/no screenshot yet/i)).toBeInTheDocument();
    expect(screen.queryByAltText(/screenshot 1/i)).not.toBeInTheDocument();
  });

  test('pasting an image adds it to the gallery; text pasted into a field stays text', async () => {
    const user = userEvent.setup();
    renderWidget({ screenshot: true });
    await openTrigger(user);
    await user.click(screen.getByRole('button', { name: /without screenshot/i }));
    expect(screen.getByText(/paste them with ctrl\+v/i)).toBeInTheDocument();

    // Office apps put a picture next to copied text: in a text field the text wins.
    const ignored = pasteImage(screen.getByRole('textbox', { name: /title/i }), 'copied cell');
    expect(ignored.defaultPrevented).toBe(false);

    const handled = pasteImage(document.body);
    expect(handled.defaultPrevented).toBe(true);
    const img = await screen.findByAltText(/screenshot 1/i);
    expect(img).toHaveAttribute('src', 'data:image/png;base64,UEFTVEVE');
    expect(screen.queryByAltText(/screenshot 2/i)).not.toBeInTheDocument();
  });

  test('upload button and drag & drop add images; non-images show a notice', async () => {
    const user = userEvent.setup({ applyAccept: false });
    renderWidget({ screenshot: true });
    await openTrigger(user);
    await user.click(screen.getByRole('button', { name: /without screenshot/i }));

    const png = new File(['x'], 'a.png', { type: 'image/png' });
    await user.upload(screen.getByTestId('feedback-image-input'), png);
    await screen.findByAltText(/screenshot 1/i);

    const dialog = screen.getByRole('dialog');
    const drop = (files: File[]) => {
      const dataTransfer = { types: ['Files'], files, dropEffect: 'none' };
      fireEvent.dragOver(dialog, { dataTransfer });
      fireEvent.drop(dialog, { dataTransfer });
    };
    drop([new File(['x'], 'b.jpg', { type: 'image/jpeg' })]);
    await screen.findByAltText(/screenshot 2/i);

    drop([new File(['x'], 'doc.pdf', { type: 'application/pdf' })]);
    expect(await screen.findByRole('alert')).toHaveTextContent(/only images/i);
    expect(screen.queryByAltText(/screenshot 3/i)).not.toBeInTheDocument();
  });

  test('shows all three types by default', async () => {
    const user = userEvent.setup();
    renderWidget();

    await openToForm(user);

    expect(screen.getByText(/Bug Report/i)).toBeInTheDocument();
    expect(screen.getByText(/Feature Request/i)).toBeInTheDocument();
    expect(screen.getByText(/General Feedback/i)).toBeInTheDocument();
  });

  test('shows only configured types', async () => {
    const user = userEvent.setup();
    renderWidget({ types: ['bug', 'feature'] });

    await openToForm(user);

    expect(screen.getByText(/Bug Report/i)).toBeInTheDocument();
    expect(screen.getByText(/Feature Request/i)).toBeInTheDocument();
    expect(screen.queryByText(/General Feedback/i)).not.toBeInTheDocument();
  });

  test('showType=false hides the type selector in the form', async () => {
    const user = userEvent.setup();
    renderWidget({ selectionMode: 'none', showType: false });

    await openTrigger(user, /feedback: feature/i);

    expect(screen.getByRole('dialog')).toBeInTheDocument();
    // No type buttons inside the modal (type was chosen at the trigger).
    expect(screen.queryByText(/Bug Report/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/Feature Request/i)).not.toBeInTheDocument();
  });

  test('closes via cancel button in selection phase', async () => {
    const user = userEvent.setup();
    renderWidget();

    await openTrigger(user);
    await user.click(screen.getByRole('button', { name: /cancel/i }));

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(screen.queryByText(/select an area/i)).not.toBeInTheDocument();
    // Floating button is back
    expect(screen.getByRole('button', { name: /open feedback/i })).toBeInTheDocument();
  });

  test('closes modal when close button is clicked', async () => {
    const user = userEvent.setup();
    renderWidget();

    await openToForm(user);
    expect(screen.getByRole('dialog')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /close feedback/i }));
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  test('submit button is disabled without title', async () => {
    const user = userEvent.setup();
    renderWidget();

    await openToForm(user);

    expect(screen.getByRole('button', { name: /submit/i })).toBeDisabled();
  });

  test('submit button enabled after entering title', async () => {
    const user = userEvent.setup();
    renderWidget();

    await openToForm(user);
    await user.type(screen.getByLabelText(/title/i), 'Test title');

    expect(screen.getByRole('button', { name: /submit/i })).not.toBeDisabled();
  });

  test('selectionMode=none skips directly to form', async () => {
    const user = userEvent.setup();
    renderWidget({ selectionMode: 'none' });

    await openTrigger(user);

    // No selection bar, dialog appears immediately
    expect(screen.queryByText(/select an area/i)).not.toBeInTheDocument();
    expect(screen.getByRole('dialog')).toBeInTheDocument();
  });
});
