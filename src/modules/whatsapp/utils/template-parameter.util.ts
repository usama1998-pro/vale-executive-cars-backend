/** Meta utility templates: each body text variable max 30 characters. */
export const UTILITY_TEMPLATE_TEXT_MAX_LENGTH = 30;

/** Meta rejects newlines/tabs and long runs of spaces in template variable text. */
export function sanitizeTemplateParameter(
  value: string,
  maxLength = UTILITY_TEMPLATE_TEXT_MAX_LENGTH,
): string {
  const cleaned = value
    .replace(/[\r\n\t]+/g, ' ')
    .replace(/\s{5,}/g, '    ')
    .trim();

  if (!maxLength || cleaned.length <= maxLength) {
    return cleaned;
  }
  if (maxLength <= 1) {
    return cleaned.slice(0, maxLength);
  }
  return `${cleaned.slice(0, maxLength - 1)}…`;
}
