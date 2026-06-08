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
