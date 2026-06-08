import { describe, test, expect } from 'vitest';
import { builtinMessages, resolveMessages, format } from '../../src/i18n.js';

describe('i18n', () => {
  test('ships en and de packs', () => {
    expect(builtinMessages['en']?.form.submit).toBe('Submit');
    expect(builtinMessages['de']?.form.submit).toBe('Absenden');
  });

  test('resolveMessages defaults to the chosen locale', () => {
    expect(resolveMessages('de').form.heading).toBe('Feedback senden');
    expect(resolveMessages('en').form.heading).toBe('Send feedback');
  });

  test('unknown locale falls back to English', () => {
    expect(resolveMessages('fr').form.submit).toBe('Submit');
  });

  test('overrides are deep-merged onto the locale pack', () => {
    const m = resolveMessages('de', { form: { submit: 'Abschicken' } });
    // Overridden key changes…
    expect(m.form.submit).toBe('Abschicken');
    // …while siblings and other sections stay from the de pack.
    expect(m.form.heading).toBe('Feedback senden');
    expect(m.success.heading).toBe('Danke!');
  });

  test('a whole new language can be supplied via overrides', () => {
    const m = resolveMessages('en', {
      trigger: { open: 'Retour' },
      form: { submit: 'Envoyer' },
    });
    expect(m.trigger.open).toBe('Retour');
    expect(m.form.submit).toBe('Envoyer');
  });

  test('format fills {token} placeholders', () => {
    expect(format('Area {width}×{height}', { width: 12, height: 34 })).toBe('Area 12×34');
    expect(format('no tokens')).toBe('no tokens');
    // Unknown tokens are left intact.
    expect(format('hi {name}', { other: 'x' })).toBe('hi {name}');
  });
});
