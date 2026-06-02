export type MetaTokenRefreshConfig = {
  appId: string;
  appSecret: string;
  graphApiVersion: string;
};

/** Seconds before expiry to refresh early (default 1 day). */
export function metaTokenRefreshBufferSeconds(): number {
  const raw = process.env.META_TOKEN_REFRESH_BUFFER_SECONDS?.trim();
  const parsed = raw ? Number.parseInt(raw, 10) : 86_400;
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 86_400;
}

/** Use WHATSAPP_TOKEN as-is (recommended for permanent / system user tokens). */
export function shouldSkipTokenExchange(): boolean {
  const raw = process.env.WHATSAPP_SKIP_TOKEN_EXCHANGE?.trim().toLowerCase();
  return raw === '1' || raw === 'true' || raw === 'yes';
}

export function isMetaTokenRefreshEnabled(): boolean {
  if (shouldSkipTokenExchange()) {
    return false;
  }
  const raw = process.env.WHATSAPP_TOKEN_REFRESH_ENABLED?.trim().toLowerCase();
  if (raw === '0' || raw === 'false' || raw === 'no') {
    return false;
  }
  return Boolean(getMetaTokenRefreshConfig());
}

export function getMetaTokenRefreshConfig(): MetaTokenRefreshConfig | null {
  const appId =
    process.env.META_APP_ID?.trim() || process.env.FACEBOOK_APP_ID?.trim();
  const appSecret =
    process.env.META_APP_SECRET?.trim() ||
    process.env.FACEBOOK_APP_SECRET?.trim();
  if (!appId || !appSecret) {
    return null;
  }

  const graphApiVersion =
    process.env.WHATSAPP_API_VERSION?.trim() ||
    extractApiVersionFromGraphUrl(process.env.FACEBOOK_GRAPH_API?.trim()) ||
    'v25.0';

  return { appId, appSecret, graphApiVersion };
}

function extractApiVersionFromGraphUrl(url?: string): string | undefined {
  if (!url) {
    return undefined;
  }
  const match = url.match(/graph\.facebook\.com\/(v[\d.]+)\//i);
  return match?.[1];
}
