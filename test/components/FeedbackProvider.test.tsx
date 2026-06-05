import React from 'react';
import { describe, test, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { FeedbackProvider } from '../../src/components/FeedbackProvider.js';
import { useFeedbackContext } from '../../src/context/FeedbackContext.js';

function TestConsumer() {
  const ctx = useFeedbackContext();
  return <div data-testid="projectId">{ctx.config.projectId}</div>;
}

describe('FeedbackProvider', () => {
  test('renders children', () => {
    render(
      <FeedbackProvider webhookUrl="http://test/webhook">
        <div data-testid="child">Hello</div>
      </FeedbackProvider>,
    );
    expect(screen.getByTestId('child')).toBeInTheDocument();
  });

  test('renders floating feedback button', () => {
    render(
      <FeedbackProvider webhookUrl="http://test/webhook">
        <div />
      </FeedbackProvider>,
    );
    expect(screen.getByRole('button', { name: /open feedback/i })).toBeInTheDocument();
  });

  test('provides config via context', () => {
    render(
      <FeedbackProvider webhookUrl="http://test/webhook" projectId="my-project">
        <TestConsumer />
      </FeedbackProvider>,
    );
    expect(screen.getByTestId('projectId').textContent).toBe('my-project');
  });

  test('defaults projectId to "default"', () => {
    render(
      <FeedbackProvider webhookUrl="http://test/webhook">
        <TestConsumer />
      </FeedbackProvider>,
    );
    expect(screen.getByTestId('projectId').textContent).toBe('default');
  });

  test('throws when useFeedbackContext is used outside provider', () => {
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {});
    expect(() => render(<TestConsumer />)).toThrow();
    spy.mockRestore();
  });
});
