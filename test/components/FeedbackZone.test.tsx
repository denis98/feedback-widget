import React from 'react';
import { describe, test, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { FeedbackProvider } from '../../src/components/FeedbackProvider.js';
import { FeedbackZone } from '../../src/components/FeedbackZone.js';

describe('FeedbackZone', () => {
  test('renders children', () => {
    render(
      <FeedbackProvider webhookUrl="http://test/webhook">
        <FeedbackZone id="test-zone" label="Test Zone">
          <p data-testid="child">Zone Content</p>
        </FeedbackZone>
      </FeedbackProvider>,
    );
    expect(screen.getByTestId('child')).toBeInTheDocument();
  });

  test('sets data-feedback-zone attribute', () => {
    render(
      <FeedbackProvider webhookUrl="http://test/webhook">
        <FeedbackZone id="nav" label="Navigation">
          <nav>Menu</nav>
        </FeedbackZone>
      </FeedbackProvider>,
    );
    expect(document.querySelector('[data-feedback-zone="nav"]')).toBeInTheDocument();
  });

  test('shows zone badge when zone is selected via click in zone mode', async () => {
    const user = userEvent.setup();
    render(
      <FeedbackProvider webhookUrl="http://test/webhook" selectionMode="zone">
        <FeedbackZone id="header" label="Header Area">
          <header data-testid="header-el">Header</header>
        </FeedbackZone>
      </FeedbackProvider>,
    );

    // Open via the hover trigger → pick a type
    await user.hover(screen.getByRole('button', { name: /open feedback/i }));
    await user.click(await screen.findByRole('button', { name: /feedback: bug/i }));
    // Click the zone
    await user.click(screen.getByTestId('header-el'));

    expect(screen.getByText(/Header Area/i)).toBeInTheDocument();
  });
});
