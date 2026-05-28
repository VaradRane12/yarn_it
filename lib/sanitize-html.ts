export function sanitizeHtml(dirty: unknown) {
  const str = typeof dirty === 'string' ? dirty : '';
  if (!str) return '';

  // Remove script and style tags and their content
  let cleaned = str.replace(/<script[\s\S]*?>[\s\S]*?<\/script>/gi, '');
  cleaned = cleaned.replace(/<style[\s\S]*?>[\s\S]*?<\/style>/gi, '');

  // Remove on* event handler attributes (onclick, onerror, etc.)
  cleaned = cleaned.replace(/\s(on[a-z]+)\s*=\s*("[^"]*"|'[^']*'|[^\s>]+)/gi, '');

  // Neutralize javascript: URIs in href/src
  cleaned = cleaned.replace(/(href|src)\s*=\s*("|')\s*javascript:[^"']*("|')/gi, '$1="#"');

  // Remove iframe tags
  cleaned = cleaned.replace(/<iframe[\s\S]*?>[\s\S]*?<\/iframe>/gi, '');

  return cleaned;
}

export default sanitizeHtml;
