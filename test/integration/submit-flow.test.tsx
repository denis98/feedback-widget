import React from 'react';
import { describe, test, expect, beforeAll, afterAll, afterEach, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse } from 'msw';
import { setupServer } from 'msw/node';
import { FeedbackProvider } from '../../src/components/FeedbackProvider.js';
import { FeedbackZone } from '../../src/components/FeedbackZone.js';
import type { WebhookPayload } from '../../src/types.js';

const WEBHOOK_URL = 'http://localhost:3333/webhook';

const capturedPayloads: WebhookPayload[] = [];

const server = setupServer(
  http.post(WEBHOOK_URL, async ({ request }) => {
    const body = await request.json();
    capturedPayloads.push(body as WebhookPayload);
    return HttpResponse.json({
      ticketId: 'TEST-1',
      ticketUrl: 'https://jira.example.com/TEST-1',
    });
  }),
);

beforeAll(() => server.listen({ onUnhandledRequest: 'error' }));
afterEach(() => {
  capturedPayloads.length = 0;
  server.resetHandlers();
});
afterAll(() => server.close());

async function fillAndSubmit(title: string, description?: string) {
  const user = userEvent.setup();
  // Hover the trigger (replaced by the type container) and pick a type.
  await user.hover(screen.getByRole('button', { name: /open feedback/i }));
  await user.click(await screen.findByRole('button', { name: /feedback: bug/i }));
  // Skip zone selection to go directly to the form
  await user.click(screen.getByRole('button', { name: /skip/i }));
  await user.type(screen.getByLabelText(/title/i), title);
  if (description) {
    await user.type(screen.getByLabelText(/description/i), description);
  }
  await user.click(screen.getByRole('button', { name: /submit/i }));
}

describe('submit flow (integration)', () => {
  test('submits payload and shows success state', async () => {
    render(
      <FeedbackProvider webhookUrl={WEBHOOK_URL} projectId="test-project">
        <div>App</div>
      </FeedbackProvider>,
    );

    await fillAndSubmit('My feedback title', 'Some description');

    await waitFor(() => {
      expect(screen.getByText(/Thank you/i)).toBeInTheDocument();
    });

    expect(capturedPayloads).toHaveLength(1);
    expect(capturedPayloads[0]?.title).toBe('My feedback title');
    // The affected page URL is appended to the description and also in context.url.
    expect(capturedPayloads[0]?.description).toBe(
      `Some description\n\nPage: ${window.location.href}`,
    );
    expect(capturedPayloads[0]?.context.url).toBe(window.location.href);
    expect(capturedPayloads[0]?.projectId).toBe('test-project');
  });

  test('shows ticket ID in success view', async () => {
    render(
      <FeedbackProvider webhookUrl={WEBHOOK_URL} projectId="test-project">
        <div>App</div>
      </FeedbackProvider>,
    );

    await fillAndSubmit('Ticket test');

    await waitFor(() => {
      expect(screen.getByText(/TEST-1/i)).toBeInTheDocument();
    });
  });

  test('submits bug report with zone info', async () => {
    const user = userEvent.setup();
    render(
      <FeedbackProvider webhookUrl={WEBHOOK_URL} projectId="test" selectionMode="zone">
        <FeedbackZone id="nav" label="Navigation">
          <nav data-testid="nav-el">Menu</nav>
        </FeedbackZone>
      </FeedbackProvider>,
    );

    await user.hover(screen.getByRole('button', { name: /open feedback/i }));
    await user.click(await screen.findByRole('button', { name: /feedback: bug/i }));
    // In zone mode: clicking the zone element triggers confirmSelection → opens form
    await user.click(screen.getByTestId('nav-el'));
    await user.type(screen.getByLabelText(/title/i), 'Nav issue');
    await user.click(screen.getByRole('button', { name: /submit/i }));

    await waitFor(() => expect(capturedPayloads).toHaveLength(1));
    expect(capturedPayloads[0]?.zone?.id).toBe('nav');
    expect(capturedPayloads[0]?.zone?.label).toBe('Navigation');
  });

  test('keeps form on error (does not show success)', async () => {
    server.use(http.post(WEBHOOK_URL, () => new HttpResponse(null, { status: 500 })));

    render(
      <FeedbackProvider
        webhookUrl={WEBHOOK_URL}
        retry={{ maxRetries: 0, baseDelay: 0, maxDelay: 0, backoffFactor: 1 }}
      >
        <div>App</div>
      </FeedbackProvider>,
    );

    await fillAndSubmit('Error test');

    await waitFor(() => {
      expect(screen.getByText(/your feedback is preserved/i)).toBeInTheDocument();
    });
    // Form still visible
    expect(screen.getByLabelText(/title/i)).toBeInTheDocument();
  });

  test('retries on 500 and succeeds', async () => {
    let attempts = 0;
    server.use(
      http.post(WEBHOOK_URL, () => {
        attempts++;
        if (attempts < 3) return new HttpResponse(null, { status: 500 });
        return HttpResponse.json({ ticketId: 'TEST-2' });
      }),
    );

    render(
      <FeedbackProvider
        webhookUrl={WEBHOOK_URL}
        retry={{ maxRetries: 3, baseDelay: 0, maxDelay: 0, backoffFactor: 1 }}
      >
        <div>App</div>
      </FeedbackProvider>,
    );

    await fillAndSubmit('Retry test');

    await waitFor(() => {
      expect(screen.getByText(/Thank you/i)).toBeInTheDocument();
    });

    expect(attempts).toBe(3);
  });

  test('calls onSuccess callback', async () => {
    const onSuccess = vi.fn();
    render(
      <FeedbackProvider webhookUrl={WEBHOOK_URL} onSuccess={onSuccess}>
        <div>App</div>
      </FeedbackProvider>,
    );

    await fillAndSubmit('Callback test');

    await waitFor(() => expect(onSuccess).toHaveBeenCalledOnce());
    expect(onSuccess).toHaveBeenCalledWith(expect.objectContaining({ ticketId: 'TEST-1' }));
  });

  test('calls onError callback on failure', async () => {
    server.use(http.post(WEBHOOK_URL, () => new HttpResponse(null, { status: 500 })));

    const onError = vi.fn();
    render(
      <FeedbackProvider
        webhookUrl={WEBHOOK_URL}
        onError={onError}
        retry={{ maxRetries: 0, baseDelay: 0, maxDelay: 0, backoffFactor: 1 }}
      >
        <div>App</div>
      </FeedbackProvider>,
    );

    await fillAndSubmit('Error callback test');

    await waitFor(() => expect(onError).toHaveBeenCalledOnce());
  });

  test('payload includes user info when configured', async () => {
    render(
      <FeedbackProvider
        webhookUrl={WEBHOOK_URL}
        user={{ id: 'u123', email: 'anna@acme.com', name: 'Anna' }}
      >
        <div>App</div>
      </FeedbackProvider>,
    );

    await fillAndSubmit('User info test');

    await waitFor(() => expect(capturedPayloads).toHaveLength(1));
    expect(capturedPayloads[0]?.user?.email).toBe('anna@acme.com');
    expect(capturedPayloads[0]?.user?.name).toBe('Anna');
    // Contact + URL are appended to the description, just like the page URL.
    expect(capturedPayloads[0]?.description).toBe(
      `Name: Anna\nEmail: anna@acme.com\nPage: ${window.location.href}`,
    );
  });

  test('hidden fields are submitted but not rendered', async () => {
    render(
      <FeedbackProvider
        webhookUrl={WEBHOOK_URL}
        fields={[
          {
            name: 'email',
            label: 'E-Mail',
            type: 'email',
            mapTo: 'email',
            hidden: true,
            defaultValue: 'silent@acme.com',
          },
          { name: 'plan', label: 'Plan', hidden: true, defaultValue: 'pro' },
        ]}
      >
        <div>App</div>
      </FeedbackProvider>,
    );

    await fillAndSubmit('Hidden field test');

    // No inputs rendered for the hidden fields.
    expect(screen.queryByLabelText(/E-Mail/i)).not.toBeInTheDocument();
    expect(screen.queryByLabelText(/Plan/i)).not.toBeInTheDocument();

    await waitFor(() => expect(capturedPayloads).toHaveLength(1));
    // …but their prefilled values reach the payload (mapTo → user, else custom).
    expect(capturedPayloads[0]?.user?.email).toBe('silent@acme.com');
    expect(capturedPayloads[0]?.custom['plan']).toBe('pro');
  });

  test('payload includes custom data', async () => {
    render(
      <FeedbackProvider
        webhookUrl={WEBHOOK_URL}
        custom={{ environment: 'staging', sprint: 'S24-03' }}
      >
        <div>App</div>
      </FeedbackProvider>,
    );

    await fillAndSubmit('Custom data test');

    await waitFor(() => expect(capturedPayloads).toHaveLength(1));
    expect(capturedPayloads[0]?.custom['environment']).toBe('staging');
    expect(capturedPayloads[0]?.custom['sprint']).toBe('S24-03');
  });
});
