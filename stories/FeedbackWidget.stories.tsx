import React from 'react';
import type { Meta, StoryObj } from '@storybook/react';
import { FeedbackProvider } from '../src/components/FeedbackProvider.js';
import { FeedbackZone } from '../src/components/FeedbackZone.js';

// Using httpbin.org as a free echo / status server for stories.
// For local development, replace with your own webhook URL.
const ECHO_URL = 'https://httpbin.org/post';
const ERROR_URL = 'https://httpbin.org/status/500';

const meta: Meta<typeof FeedbackProvider> = {
  title: 'FeedbackWidget',
  component: FeedbackProvider,
  parameters: { layout: 'fullscreen' },
  tags: ['autodocs'],
};

export default meta;
type Story = StoryObj<typeof FeedbackProvider>;

// ---------------------------------------------------------------------------
// Default – all types, hybrid selection
// ---------------------------------------------------------------------------
export const Default: Story = {
  name: 'Default (All Types, Hybrid)',
  render: () => (
    <FeedbackProvider webhookUrl={ECHO_URL} projectId="storybook-demo">
      <FeedbackZone id="hero" label="Hero Section">
        <section style={{ padding: '40px', background: '#f0f9ff' }}>
          <h1>Hero Section</h1>
          <p>This is wrapped in a FeedbackZone. Click the Feedback button and select this area.</p>
        </section>
      </FeedbackZone>
      <FeedbackZone id="content" label="Main Content">
        <main style={{ padding: '40px' }}>
          <p>Main content area. Also a FeedbackZone.</p>
        </main>
      </FeedbackZone>
    </FeedbackProvider>
  ),
};

// ---------------------------------------------------------------------------
// Bug Report Only
// ---------------------------------------------------------------------------
export const BugReportOnly: Story = {
  name: 'Bug Report Only',
  render: () => (
    <FeedbackProvider webhookUrl={ECHO_URL} types={['bug']}>
      <div style={{ padding: '40px' }}>
        <h2>Only Bug Reports allowed</h2>
        <p>The widget will only show the Bug Report type.</p>
      </div>
    </FeedbackProvider>
  ),
};

// ---------------------------------------------------------------------------
// Feature Requests Only
// ---------------------------------------------------------------------------
export const FeatureRequestOnly: Story = {
  name: 'Feature Request Only',
  render: () => (
    <FeedbackProvider webhookUrl={ECHO_URL} types={['feature']}>
      <div style={{ padding: '40px' }}>
        <h2>Feature Requests only</h2>
      </div>
    </FeedbackProvider>
  ),
};

// ---------------------------------------------------------------------------
// Zone Mode – only explicit FeedbackZones are selectable
// ---------------------------------------------------------------------------
export const ZoneMode: Story = {
  name: 'Zone Mode (Multiple Zones)',
  render: () => (
    <FeedbackProvider webhookUrl={ECHO_URL} selectionMode="zone">
      <div style={{ display: 'grid', gridTemplateColumns: '200px 1fr', minHeight: '100vh' }}>
        <FeedbackZone id="sidebar" label="Sidebar" meta={{ team: 'nav' }}>
          <aside style={{ background: '#1e293b', color: '#fff', padding: '20px' }}>
            <h3>Sidebar</h3>
            <ul>
              <li>Dashboard</li>
              <li>Settings</li>
            </ul>
          </aside>
        </FeedbackZone>
        <div>
          <FeedbackZone id="header" label="Header">
            <header style={{ background: '#f1f5f9', padding: '16px 24px', borderBottom: '1px solid #e2e8f0' }}>
              <h1 style={{ margin: 0, fontSize: '18px' }}>App Header</h1>
            </header>
          </FeedbackZone>
          <FeedbackZone id="main" label="Main Content">
            <main style={{ padding: '24px' }}>
              <p>Main content. Hover the zones (sidebar, header, main) to see the selection highlight.</p>
            </main>
          </FeedbackZone>
        </div>
      </div>
    </FeedbackProvider>
  ),
};

// ---------------------------------------------------------------------------
// Pixel Mode – free element selection
// ---------------------------------------------------------------------------
export const PixelMode: Story = {
  name: 'Pixel Mode (Free Selection)',
  render: () => (
    <FeedbackProvider webhookUrl={ECHO_URL} selectionMode="pixel">
      <div style={{ padding: '40px' }}>
        <h2>Pixel Selection Mode</h2>
        <p>Open the widget, then hover any element on the page and click to select it.</p>
        <div style={{ display: 'flex', gap: '16px', marginTop: '24px' }}>
          <div style={{ padding: '16px', background: '#fef3c7', borderRadius: '8px' }}>Card A</div>
          <div style={{ padding: '16px', background: '#d1fae5', borderRadius: '8px' }}>Card B</div>
          <div style={{ padding: '16px', background: '#dbeafe', borderRadius: '8px' }}>Card C</div>
        </div>
      </div>
    </FeedbackProvider>
  ),
};

// ---------------------------------------------------------------------------
// No Selection Mode
// ---------------------------------------------------------------------------
export const NoSelection: Story = {
  name: 'No Selection (Form Only)',
  render: () => (
    <FeedbackProvider webhookUrl={ECHO_URL} selectionMode="none">
      <div style={{ padding: '40px' }}>
        <h2>No zone/pixel selection – just the form.</h2>
      </div>
    </FeedbackProvider>
  ),
};

// ---------------------------------------------------------------------------
// Webhook Error + Retry
// ---------------------------------------------------------------------------
export const WebhookError: Story = {
  name: 'Webhook Error (Retry Simulation)',
  render: () => (
    <FeedbackProvider
      webhookUrl={ERROR_URL}
      retry={{ maxRetries: 2, baseDelay: 500, maxDelay: 2000, backoffFactor: 2 }}
    >
      <div style={{ padding: '40px' }}>
        <h2>Webhook returns 500</h2>
        <p>Submit feedback to see retry behavior and the error state. The form is preserved.</p>
      </div>
    </FeedbackProvider>
  ),
};

// ---------------------------------------------------------------------------
// Dark Theme
// ---------------------------------------------------------------------------
export const DarkTheme: Story = {
  name: 'Dark Theme',
  render: () => (
    <FeedbackProvider webhookUrl={ECHO_URL} theme="dark" position="bottom-left">
      <div style={{ background: '#0f172a', color: '#f8fafc', minHeight: '100vh', padding: '40px' }}>
        <h1 style={{ color: '#f8fafc' }}>Dark Mode App</h1>
        <p style={{ color: '#94a3b8' }}>The widget uses the dark theme. Button is bottom-left.</p>
      </div>
    </FeedbackProvider>
  ),
};

// ---------------------------------------------------------------------------
// With User Info
// ---------------------------------------------------------------------------
export const WithUserInfo: Story = {
  name: 'With User Info',
  render: () => (
    <FeedbackProvider
      webhookUrl={ECHO_URL}
      user={{ id: 'u_123', email: 'anna@acme.com', name: 'Anna Müller' }}
      custom={{ environment: 'storybook', sprint: 'S24-03' }}
    >
      <div style={{ padding: '40px' }}>
        <h2>User info is attached to every payload</h2>
        <p>Check the webhook payload – it will include user and custom data.</p>
      </div>
    </FeedbackProvider>
  ),
};

// ---------------------------------------------------------------------------
// Auto Discovery (data attributes)
// ---------------------------------------------------------------------------
export const AutoDiscovery: Story = {
  name: 'Auto-Discovery (data-feedback-zone)',
  render: () => (
    <FeedbackProvider webhookUrl={ECHO_URL} autoDiscovery={true} selectionMode="zone">
      <div>
        <div
          data-feedback-zone="auto-header"
          data-feedback-label="Auto-Discovered Header"
          style={{ background: '#f0fdf4', padding: '20px' }}
        >
          <h2>Auto-Discovered Header</h2>
          <p>This zone is detected via <code>data-feedback-zone</code> attribute – no React import needed.</p>
        </div>
        <div
          data-feedback-zone="auto-content"
          data-feedback-label="Auto-Discovered Content"
          data-feedback-meta='{"team":"platform"}'
          style={{ padding: '20px' }}
        >
          <p>Content area with meta data attached.</p>
        </div>
      </div>
    </FeedbackProvider>
  ),
};
