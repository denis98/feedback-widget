/**
 * Internationalization for the feedback widget.
 *
 * Every user-facing string lives in a {@link Messages} dictionary. Two packs
 * ship built in (`en`, `de`); host apps pick one via the `locale` prop and can
 * override any subset of strings — or add a whole new language — via the
 * `messages` prop (deep-merged onto the chosen pack).
 *
 * Interpolated strings use `{token}` placeholders, filled in by {@link format}.
 */

export interface Messages {
  trigger: {
    /** Visible label on the floating button. */
    open: string;
    /** Accessible name of the floating button. */
    openAria: string;
    /** Accessible name of the type-picker group shown on hover. */
    chooseType: string;
    /** Accessible name of each type button. `{type}` = the type's label. */
    typeAria: string;
  };
  /** Short type labels (floating trigger). */
  types: { bug: string; feature: string; general: string };
  /** Long type labels (in-form selector). */
  typesLong: { bug: string; feature: string; general: string };
  selection: {
    prompt: string;
    fullScreen: string;
    skip: string;
    withoutScreenshot: string;
    /** `{label}` = the selected zone/region label. */
    selected: string;
    continue: string;
    clearSelection: string;
    cancel: string;
    /** Region zone label. `{width}`, `{height}` in CSS pixels. */
    region: string;
  };
  capturing: string;
  form: {
    heading: string;
    close: string;
    screenshots: string;
    screenshotsHint: string;
    noScreenshot: string;
    enlargeTitle: string;
    remove: string;
    /** `{index}` = 1-based screenshot number. */
    removeScreenshot: string;
    title: string;
    titlePlaceholder: string;
    description: string;
    descriptionPlaceholder: string;
    optional: string;
    /** `{field}` = the field's label. */
    requiredField: string;
    /** `{field}` = the field's label. */
    invalidEmail: string;
    /** `{message}` = the underlying error message. */
    submitError: string;
    addScreenshot: string;
    submit: string;
    submitting: string;
    /** Prefix for the affected page URL (e.g. shown as `Page: <url>`). */
    pageLabel: string;
    /** Prefix for the submitter's name appended to the description. */
    nameLabel: string;
    /** Prefix for the submitter's email appended to the description. */
    emailLabel: string;
  };
  success: { heading: string; message: string; close: string };
  annotator: {
    title: string;
    pen: string;
    penTitle: string;
    rect: string;
    rectTitle: string;
    /** `{color}` = the colour value. */
    color: string;
    undo: string;
    undoTitle: string;
    clear: string;
    clearTitle: string;
    cancel: string;
    save: string;
  };
}

export type DeepPartial<T> = {
  [K in keyof T]?: T[K] extends object ? DeepPartial<T[K]> : T[K];
};

const en: Messages = {
  trigger: {
    open: 'Feedback',
    openAria: 'Open feedback',
    chooseType: 'Choose feedback type',
    typeAria: 'Feedback: {type}',
  },
  types: { bug: 'Bug', feature: 'Feature', general: 'General' },
  typesLong: { bug: 'Bug Report', feature: 'Feature Request', general: 'General Feedback' },
  selection: {
    prompt: '🎯 Drag to select an area or click an element –',
    fullScreen: '🖥 Whole screen',
    skip: 'Skip',
    withoutScreenshot: 'Without screenshot',
    selected: '📍 {label} selected',
    continue: 'Continue →',
    clearSelection: 'Clear selection',
    cancel: 'Cancel',
    region: 'Area {width}×{height}',
  },
  capturing: '📸 Capturing screenshot…',
  form: {
    heading: 'Send feedback',
    close: 'Close feedback',
    screenshots: 'Screenshots',
    screenshotsHint: 'click to enlarge & annotate',
    noScreenshot: 'No screenshot yet. Capture an area via “Add image”.',
    enlargeTitle: 'Enlarge & annotate',
    remove: 'Remove',
    removeScreenshot: 'Remove screenshot {index}',
    title: 'Title',
    titlePlaceholder: 'Brief summary',
    description: 'Description',
    descriptionPlaceholder: 'More details (optional)',
    optional: '(optional)',
    requiredField: 'Please fill in “{field}”.',
    invalidEmail: '“{field}”: please enter a valid email address.',
    submitError: '⚠️ {message} – your feedback is preserved.',
    addScreenshot: '＋ Add image',
    submit: 'Submit',
    submitting: 'Sending…',
    pageLabel: 'Page',
    nameLabel: 'Name',
    emailLabel: 'Email',
  },
  success: {
    heading: 'Thank you!',
    message: 'Your feedback has been received.',
    close: 'Close',
  },
  annotator: {
    title: 'Edit screenshot',
    pen: '✏️ Pen',
    penTitle: 'Freehand draw',
    rect: '▭ Box',
    rectTitle: 'Mark rectangle',
    color: 'Color {color}',
    undo: '↶ Undo',
    undoTitle: 'Undo',
    clear: '🗑 Clear',
    clearTitle: 'Clear all',
    cancel: 'Cancel',
    save: '✓ Apply',
  },
};

const de: Messages = {
  trigger: {
    open: 'Feedback',
    openAria: 'Feedback öffnen',
    chooseType: 'Feedback-Typ wählen',
    typeAria: 'Feedback: {type}',
  },
  types: { bug: 'Bug', feature: 'Feature', general: 'Allgemein' },
  typesLong: { bug: 'Fehler melden', feature: 'Funktionswunsch', general: 'Allgemeines Feedback' },
  selection: {
    prompt: '🎯 Bereich aufziehen oder Element anklicken –',
    fullScreen: '🖥 Ganzer Bildschirm',
    skip: 'Überspringen',
    withoutScreenshot: 'Ohne Screenshot',
    selected: '📍 {label} ausgewählt',
    continue: 'Weiter →',
    clearSelection: 'Auswahl entfernen',
    cancel: 'Abbrechen',
    region: 'Bereich {width}×{height}',
  },
  capturing: '📸 Screenshot wird erstellt…',
  form: {
    heading: 'Feedback senden',
    close: 'Feedback schließen',
    screenshots: 'Screenshots',
    screenshotsHint: 'anklicken zum Vergrößern & Markieren',
    noScreenshot: 'Noch kein Screenshot. Über „Weiteres Bild“ einen Bereich aufnehmen.',
    enlargeTitle: 'Vergrößern & markieren',
    remove: 'Entfernen',
    removeScreenshot: 'Screenshot {index} entfernen',
    title: 'Titel',
    titlePlaceholder: 'Kurze Zusammenfassung',
    description: 'Beschreibung',
    descriptionPlaceholder: 'Weitere Details (optional)',
    optional: '(optional)',
    requiredField: 'Bitte „{field}“ ausfüllen.',
    invalidEmail: '„{field}“: bitte eine gültige E-Mail-Adresse angeben.',
    submitError: '⚠️ {message} – dein Feedback bleibt erhalten.',
    addScreenshot: '＋ Weiteres Bild',
    submit: 'Absenden',
    submitting: 'Wird gesendet…',
    pageLabel: 'Seite',
    nameLabel: 'Name',
    emailLabel: 'E-Mail',
  },
  success: {
    heading: 'Danke!',
    message: 'Dein Feedback ist eingegangen.',
    close: 'Schließen',
  },
  annotator: {
    title: 'Screenshot bearbeiten',
    pen: '✏️ Stift',
    penTitle: 'Freihand zeichnen',
    rect: '▭ Rahmen',
    rectTitle: 'Rechteck markieren',
    color: 'Farbe {color}',
    undo: '↶ Zurück',
    undoTitle: 'Rückgängig',
    clear: '🗑 Leeren',
    clearTitle: 'Alles löschen',
    cancel: 'Abbrechen',
    save: '✓ Übernehmen',
  },
};

/** Built-in message packs, keyed by locale. */
export const builtinMessages: Record<string, Messages> = { en, de };

function isPlainObject(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null && !Array.isArray(v);
}

/** Deep-merge `overrides` onto a full `base`, returning a complete object. */
function deepMerge<T>(base: T, overrides?: DeepPartial<T>): T {
  if (!overrides) return base;
  const out: Record<string, unknown> = { ...(base as Record<string, unknown>) };
  for (const [key, value] of Object.entries(overrides as Record<string, unknown>)) {
    if (value === undefined) continue;
    const baseValue = out[key];
    out[key] =
      isPlainObject(baseValue) && isPlainObject(value)
        ? deepMerge(baseValue, value as DeepPartial<typeof baseValue>)
        : value;
  }
  return out as T;
}

/**
 * Resolve the active message dictionary: start from the built-in pack for
 * `locale` (falling back to English for unknown locales), then deep-merge the
 * host app's `overrides` on top.
 */
export function resolveMessages(locale: string, overrides?: DeepPartial<Messages>): Messages {
  const base = builtinMessages[locale] ?? builtinMessages['en']!;
  return deepMerge(base, overrides);
}

/** Replace `{token}` placeholders in `template` with values from `vars`. */
export function format(template: string, vars?: Record<string, string | number>): string {
  if (!vars) return template;
  return template.replace(/\{(\w+)\}/g, (match, key: string) =>
    key in vars ? String(vars[key]) : match,
  );
}
