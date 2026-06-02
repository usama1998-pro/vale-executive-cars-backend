/** Digits-only E.164 without leading + (Meta WhatsApp `to` field). */
export function normalizeWhatsappRecipient(
  phone: string,
  defaultCountryCode = '44',
): string {
  let digits = phone.replace(/\D/g, '');
  if (!digits) {
    return digits;
  }
  if (digits.startsWith('0')) {
    digits = `${defaultCountryCode}${digits.slice(1)}`;
  }
  return digits;
}

/**
 * Owner/business notification number from `WHATSAPP_TO` only.
 * Never uses the booking customer `contactNumber`.
 */
export function resolveOwnerWhatsappTo(
  whatsappTo: string | undefined,
  defaultCountryCode: string,
): string | null {
  const raw = whatsappTo?.trim();
  if (!raw) {
    return null;
  }
  const to = normalizeWhatsappRecipient(raw, defaultCountryCode);
  if (!to || to.length < 10) {
    return null;
  }
  return to;
}
