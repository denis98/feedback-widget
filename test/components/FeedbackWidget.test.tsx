import React from 'react';
import { describe, test, expect } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { FeedbackProvider } from '../../src/components/FeedbackProvider.js';

function renderWidget(props: Partial<Parameters<typeof FeedbackProvider>[0]> = {}) {
  return render(
    <FeedbackProvider webhookUrl="http://test/webhook" {...props}>
      <div>App Content</div>
    </FeedbackProvider>,
  );
}

/** Opens widget and navigates through selection to the form */
async function openToForm(user: ReturnType<typeof userEvent.setup>) {
  await user.click(screen.getByRole('button', { name: /open feedback/i }));
  // Selection bar appears → skip selection to go directly to form
  await user.click(screen.getByRole('button', { name: /überspringen/i }));
}

describe('FeedbackWidget', () => {
  test('modal is closed by default', () => {
    renderWidget();
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  test('clicking the button enters selection phase (no modal yet)', async () => {
    const user = userEvent.setup();
    renderWidget();

    await user.click(screen.getByRole('button', { name: /open feedback/i }));

    // Selection bar visible, not yet the form
    expect(screen.getByText(/Bereich aufziehen/i)).toBeInTheDocument();
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
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

    await user.click(screen.getByRole('button', { name: /open feedback/i }));
    // With screenshot on, the skip action is labelled "Ganzer Bildschirm".
    await user.click(screen.getByRole('button', { name: /ganzer bildschirm/i }));

    // Capture runs in confirmSelection → falls back to modern-screenshot (mocked) in jsdom.
    const img = await waitFor(() => screen.getByAltText(/screenshot 1/i));
    expect(img).toHaveAttribute('src', expect.stringContaining('data:image/png;base64,'));

    // The form offers adding more images.
    expect(screen.getByRole('button', { name: /weiteres bild/i })).toBeInTheDocument();

    // Removing the screenshot empties the gallery.
    await user.click(screen.getByRole('button', { name: /screenshot 1 entfernen/i }));
    expect(screen.queryByAltText(/screenshot 1/i)).not.toBeInTheDocument();
    expect(screen.getByText(/noch kein screenshot/i)).toBeInTheDocument();
  });

  test('"Ohne Screenshot" opens the form without capturing', async () => {
    const user = userEvent.setup();
    renderWidget({ screenshot: true });

    await user.click(screen.getByRole('button', { name: /open feedback/i }));
    await user.click(screen.getByRole('button', { name: /ohne screenshot/i }));

    expect(screen.getByRole('dialog')).toBeInTheDocument();
    expect(screen.getByText(/noch kein screenshot/i)).toBeInTheDocument();
    expect(screen.queryByAltText(/screenshot 1/i)).not.toBeInTheDocument();
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

  test('closes via cancel button in selection phase', async () => {
    const user = userEvent.setup();
    renderWidget();

    await user.click(screen.getByRole('button', { name: /open feedback/i }));
    await user.click(screen.getByRole('button', { name: /abbrechen/i }));

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(screen.queryByText(/Bereich aufziehen/i)).not.toBeInTheDocument();
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

    expect(screen.getByRole('button', { name: /absenden/i })).toBeDisabled();
  });

  test('submit button enabled after entering title', async () => {
    const user = userEvent.setup();
    renderWidget();

    await openToForm(user);
    await user.type(screen.getByLabelText(/title/i), 'Test title');

    expect(screen.getByRole('button', { name: /absenden/i })).not.toBeDisabled();
  });

  test('selectionMode=none skips directly to form', async () => {
    const user = userEvent.setup();
    renderWidget({ selectionMode: 'none' });

    await user.click(screen.getByRole('button', { name: /open feedback/i }));

    // No selection bar, dialog appears immediately
    expect(screen.queryByText(/Bereich aufziehen/i)).not.toBeInTheDocument();
    expect(screen.getByRole('dialog')).toBeInTheDocument();
  });
});
