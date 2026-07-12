export type WhatsappConfig = {
  enabled: boolean;
  accessToken: string;
  /** Full Meta messages endpoint, e.g. https://graph.facebook.com/v25.0/{phone-number-id}/messages */
  graphApiUrl: string;
  phoneNumberId?: string;
  businessName: string;
  bookingConfirmationTemplate: string;
  templateLanguageCode: string;
  defaultCountryCode: string;
  /** Owner notification number (`WHATSAPP_TO`) — sole WhatsApp `to` for booking alerts. */
  whatsappTo?: string;
  verifyToken?: string;
  businessAccountId?: string;
};

function readToken(): string | undefined {
  return (
    process.env.WHATSAPP_TOKEN?.trim() ||
    process.env.WHATSAPP_ACCESS_TOKEN?.trim()
  );
}

function extractPhoneNumberIdFromGraphUrl(url: string): string | undefined {
  const match = url.match(/graph\.facebook\.com\/v[\d.]+\/(\d+)\/messages/i);
  return match?.[1];
}

/** Prefer `FACEBOOK_GRAPH_API`; otherwise build from phone number id + API version. */
export function resolveGraphApiUrl(): string | undefined {
  const fromEnv = process.env.FACEBOOK_GRAPH_API?.trim();
  if (fromEnv) {
    return fromEnv.replace(/\/$/, '');
  }

  const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID?.trim();
  if (!phoneNumberId) {
    return undefined;
  }

  const apiVersion = process.env.WHATSAPP_API_VERSION?.trim() || 'v22.0';
  return `https://graph.facebook.com/${apiVersion}/${phoneNumberId}/messages`;
}

export function getWhatsappConfig(): WhatsappConfig | null {
  const accessToken = readToken();
  const graphApiUrl = resolveGraphApiUrl();
  if (!accessToken || !graphApiUrl) {
    return null;
  }

  const enabledRaw = process.env.WHATSAPP_ENABLED?.trim().toLowerCase();
  const enabled =
    enabledRaw === undefined ||
    enabledRaw === '1' ||
    enabledRaw === 'true' ||
    enabledRaw === 'yes';

  const phoneNumberId =
    process.env.WHATSAPP_PHONE_NUMBER_ID?.trim() ||
    extractPhoneNumberIdFromGraphUrl(graphApiUrl);

  return {
    enabled,
    accessToken,
    graphApiUrl,
    phoneNumberId,
    businessName:
      process.env.WHATSAPP_BUSINESS_NAME?.trim() || 'Vale Executives Cars',
    bookingConfirmationTemplate:
      process.env.WHATSAPP_BOOKING_TEMPLATE?.trim() ||
      'vale_booking_message',
    templateLanguageCode: 'en',
    defaultCountryCode:
      process.env.WHATSAPP_DEFAULT_COUNTRY_CODE?.trim() || '44',
    whatsappTo: process.env.WHATSAPP_TO?.trim() || undefined,
    verifyToken: process.env.WHATSAPP_VERIFY_TOKEN?.trim(),
    businessAccountId: process.env.WHATSAPP_BUSINESS_ACCOUNT_ID?.trim(),
  };
}

export function requireWhatsappConfig(): WhatsappConfig {
  const config = getWhatsappConfig();
  if (!config) {
    throw new Error(
      'WhatsApp is not configured. Set WHATSAPP_TOKEN and FACEBOOK_GRAPH_API (or WHATSAPP_PHONE_NUMBER_ID).',
    );
  }
  if (!config.enabled) {
    throw new Error('WhatsApp is disabled (WHATSAPP_ENABLED=false).');
  }
  return config;
}
