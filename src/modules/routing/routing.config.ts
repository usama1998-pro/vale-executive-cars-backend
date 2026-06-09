export type RoutingConfig = {
  googleMapsApiKey: string;
  /** ISO country codes for Places/Geocoding filters, e.g. `['gb', 'pk']`. */
  countryCodes: string[];
  /** Region bias for Google APIs (e.g. `uk`). */
  region: string;
  requestTimeoutMs: number;
};

export function getRoutingConfig(): RoutingConfig {
  const googleMapsApiKey = process.env.GOOGLE_MAPS_API_KEY?.trim() ?? '';
  if (!googleMapsApiKey) {
    throw new Error('GOOGLE_MAPS_API_KEY is required');
  }

  const countryCodesRaw =
    process.env.GOOGLE_MAPS_COUNTRY_CODES?.trim() || 'gb,pk';
  const countryCodes = countryCodesRaw
    .split(',')
    .map((code) => code.trim().toLowerCase())
    .filter(Boolean);

  const region = process.env.GOOGLE_MAPS_REGION?.trim() || 'uk';

  const timeoutRaw = Number(process.env.ROUTING_TIMEOUT_MS ?? 30_000);
  const requestTimeoutMs =
    Number.isFinite(timeoutRaw) && timeoutRaw > 0 ? timeoutRaw : 30_000;

  return {
    googleMapsApiKey,
    countryCodes: countryCodes.length > 0 ? countryCodes : ['gb', 'pk'],
    region,
    requestTimeoutMs,
  };
}
