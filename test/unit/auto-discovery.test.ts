import { describe, test, expect, vi, beforeEach, afterEach } from 'vitest';
import { startAutoDiscovery } from '../../src/components/AutoDiscovery.js';
import type { ZoneRegistration } from '../../src/types.js';

describe('AutoDiscovery', () => {
  let container: HTMLElement;
  let registered: ZoneRegistration[];
  let unregistered: string[];

  beforeEach(() => {
    container = document.createElement('div');
    document.body.appendChild(container);
    registered = [];
    unregistered = [];
  });

  afterEach(() => {
    document.body.removeChild(container);
  });

  test('registers existing data-feedback-zone elements on start', () => {
    const zone = document.createElement('div');
    zone.dataset['feedbackZone'] = 'my-zone';
    zone.dataset['feedbackLabel'] = 'My Zone';
    document.body.appendChild(zone);

    startAutoDiscovery(
      document,
      (z) => registered.push(z),
      (id) => unregistered.push(id),
    );

    expect(registered.some((z) => z.id === 'my-zone')).toBe(true);
    document.body.removeChild(zone);
  });

  test('parses meta JSON from data-feedback-meta attribute', () => {
    const zone = document.createElement('div');
    zone.dataset['feedbackZone'] = 'zone-meta';
    zone.dataset['feedbackLabel'] = 'Zone With Meta';
    zone.dataset['feedbackMeta'] = JSON.stringify({ team: 'frontend' });
    document.body.appendChild(zone);

    startAutoDiscovery(
      document,
      (z) => registered.push(z),
      (id) => unregistered.push(id),
    );

    const found = registered.find((z) => z.id === 'zone-meta');
    expect(found?.meta?.['team']).toBe('frontend');
    document.body.removeChild(zone);
  });

  test('ignores elements missing label', () => {
    const zone = document.createElement('div');
    zone.dataset['feedbackZone'] = 'no-label';
    // no feedbackLabel set
    document.body.appendChild(zone);

    startAutoDiscovery(
      document,
      (z) => registered.push(z),
      (id) => unregistered.push(id),
    );

    expect(registered.some((z) => z.id === 'no-label')).toBe(false);
    document.body.removeChild(zone);
  });

  test('returns disconnect function', () => {
    const disconnect = startAutoDiscovery(
      document,
      (z) => registered.push(z),
      (id) => unregistered.push(id),
    );

    expect(typeof disconnect).toBe('function');
    expect(() => disconnect()).not.toThrow();
  });
});
