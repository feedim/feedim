/**
 * Security Utilities - HTML Sanitization
 * IMPORTANT: Protects against XSS attacks
 */

/**
 * Escape HTML special characters to prevent XSS attacks
 * @param text - User input text to sanitize
 * @returns Sanitized text safe for HTML insertion
 */
export function escapeHtml(text: string): string {
  const htmlEscapeMap: Record<string, string> = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#x27;',
    '/': '&#x2F;',
  };

  return text.replace(/[&<>"'/]/g, (char) => htmlEscapeMap[char] || char);
}

/**
 * Validate and sanitize URL to prevent javascript: and data: protocols
 * @param url - URL to validate
 * @returns Safe URL or empty string if invalid
 */
export function sanitizeUrl(url: string): string {
  if (!url) return '';

  const trimmedUrl = url.trim();

  // Block dangerous protocols
  const dangerousProtocols = ['javascript:', 'data:', 'vbscript:', 'file:'];
  const lowerUrl = trimmedUrl.toLowerCase();

  for (const protocol of dangerousProtocols) {
    if (lowerUrl.startsWith(protocol)) {
      if (process.env.NODE_ENV === 'development') {
        console.warn(`Blocked dangerous URL protocol: ${protocol}`);
      }
      return '';
    }
  }

  // Only allow http, https, mailto, and relative URLs
  if (
    !trimmedUrl.startsWith('http://') &&
    !trimmedUrl.startsWith('https://') &&
    !trimmedUrl.startsWith('mailto:') &&
    !trimmedUrl.startsWith('/') &&
    !trimmedUrl.startsWith('#')
  ) {
    // If no protocol, assume https
    return 'https://' + trimmedUrl;
  }

  return trimmedUrl;
}

/**
 * Sanitize user input based on field type
 * @param value - User input value
 * @param type - Type of field (text, url, image, etc.)
 * @returns Sanitized value
 */
export function sanitizeByType(value: string, type: string): string {
  if (!value) return '';

  switch (type) {
    case 'url':
    case 'image':
    case 'background-image':
    case 'video':
      return sanitizeUrl(value);

    case 'color':
      // Validate hex color format
      if (/^#[0-9A-Fa-f]{6}$/.test(value) || /^#[0-9A-Fa-f]{3}$/.test(value)) {
        return value;
      }
      if (process.env.NODE_ENV === 'development') {
        console.warn(`Invalid color format: ${value}`);
      }
      return '#000000';

    case 'text':
    case 'textarea':
    case 'date':
    default:
      return escapeHtml(value);
  }
}

