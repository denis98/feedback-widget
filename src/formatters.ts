import type { WebhookPayload, ZoneInfo, FeedbackContext } from './types.js';

function formatType(type: WebhookPayload['type']): string {
  const map = { bug: 'Bug Report', feature: 'Feature Request', general: 'General Feedback' };
  return map[type];
}

export const formatters = {
  toMarkdown(payload: WebhookPayload): string {
    const lines: string[] = [
      `## ${formatType(payload.type)}: ${payload.title}`,
      '',
      payload.description,
      '',
      '---',
      '',
      formatters.zoneInfo(payload.zone),
      '',
      formatters.metadataTable(payload.context),
    ];

    if (payload.user) {
      lines.push('', '### User', formatUserInfo(payload.user));
    }

    if (Object.keys(payload.custom).length > 0) {
      lines.push('', '### Custom Data', formatCustomData(payload.custom, 'markdown'));
    }

    return lines.filter((l) => l !== undefined).join('\n').trim();
  },

  toPlainText(payload: WebhookPayload): string {
    const lines: string[] = [
      `${formatType(payload.type)}: ${payload.title}`,
      '='.repeat(50),
      '',
      payload.description,
      '',
      payload.zone ? `Zone: ${payload.zone.label} (${payload.zone.id})` : 'Zone: None',
      '',
      `URL: ${payload.context.url}`,
      `Time: ${payload.context.timestamp}`,
      `Browser: ${payload.context.userAgent}`,
      `Viewport: ${payload.context.viewport.width}x${payload.context.viewport.height}`,
      `Locale: ${payload.context.locale}`,
    ];

    if (payload.user) {
      const u = payload.user;
      lines.push('', `User: ${u.name ?? ''} <${u.email ?? ''}> (${u.id ?? 'anonymous'})`);
    }

    return lines.join('\n').trim();
  },

  toHTML(payload: WebhookPayload): string {
    const escape = (s: string) =>
      s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

    return `
<article>
  <h2>${escape(formatType(payload.type))}: ${escape(payload.title)}</h2>
  <p>${escape(payload.description).replace(/\n/g, '<br>')}</p>
  ${payload.zone ? `<p><strong>Zone:</strong> ${escape(payload.zone.label)}</p>` : ''}
  <table>
    <tr><th>URL</th><td>${escape(payload.context.url)}</td></tr>
    <tr><th>Time</th><td>${escape(payload.context.timestamp)}</td></tr>
    <tr><th>Browser</th><td>${escape(payload.context.userAgent)}</td></tr>
    <tr><th>Viewport</th><td>${payload.context.viewport.width}x${payload.context.viewport.height}</td></tr>
    <tr><th>Locale</th><td>${escape(payload.context.locale)}</td></tr>
  </table>
</article>`.trim();
  },

  metadataTable(context: FeedbackContext): string {
    return [
      '### Metadata',
      '',
      '| Key | Value |',
      '|-----|-------|',
      `| URL | ${context.url} |`,
      `| Timestamp | ${context.timestamp} |`,
      `| UserAgent | ${context.userAgent} |`,
      `| Viewport | ${context.viewport.width}x${context.viewport.height} |`,
      `| Locale | ${context.locale} |`,
    ].join('\n');
  },

  zoneInfo(zone: ZoneInfo | null): string {
    if (!zone) return '### Zone\n\nNo zone selected.';
    const lines = [
      '### Zone',
      '',
      `**Label:** ${zone.label}`,
      `**ID:** ${zone.id}`,
    ];
    if (zone.cssPath) lines.push(`**CSS Path:** \`${zone.cssPath}\``);
    if (zone.meta && Object.keys(zone.meta).length > 0) {
      lines.push('**Meta:**', '```json', JSON.stringify(zone.meta, null, 2), '```');
    }
    return lines.join('\n');
  },
};

function formatUserInfo(user: NonNullable<WebhookPayload['user']>): string {
  const parts = [
    user.name && `**Name:** ${user.name}`,
    user.email && `**Email:** ${user.email}`,
    user.id && `**ID:** ${user.id}`,
  ].filter(Boolean);
  return parts.join('\n');
}

function formatCustomData(
  custom: Record<string, unknown>,
  _format: 'markdown' | 'plain',
): string {
  return '```json\n' + JSON.stringify(custom, null, 2) + '\n```';
}
