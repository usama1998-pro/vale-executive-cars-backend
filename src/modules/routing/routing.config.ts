export type RoutingConfig = {
  osrmBaseUrl: string;
  nominatimBaseUrl: string;
  /** ISO country filter for Nominatim (comma-separated), e.g. `gb,pk`. */
  nominatimCountryCodes: string;
  /** Multiplier applied to straight-line miles when OSRM road data looks incomplete. */
  roadFactor: number;
  userAgent: string;
  requestTimeoutMs: number;
};

export function getRoutingConfig(): RoutingConfig {
  const osrmBaseUrl = (
    process.env.OPENSTREET_MAP_URL?.trim() ||
    'https://router.project-osrm.org/route/v1/driving'
  ).replace(/\/$/, '');

  const nominatimBaseUrl = (
    process.env.NOMINATIM_URL?.trim() ||
    'https://nominatim.openstreetmap.org'
  ).replace(/\/$/, '');

  const nominatimCountryCodes =
    process.env.NOMINATIM_COUNTRY_CODES?.trim() || 'gb,pk';

  const roadFactorRaw = Number(process.env.ROUTING_ROAD_FACTOR ?? 1.4);
  const roadFactor =
    Number.isFinite(roadFactorRaw) && roadFactorRaw >= 1 ? roadFactorRaw : 1.4;

  const userAgent =
    process.env.ROUTING_USER_AGENT?.trim() ||
    'ValeExecutivesCars/1.0 (booking quote service)';

  const timeoutRaw = Number(process.env.ROUTING_TIMEOUT_MS ?? 30_000);
  const requestTimeoutMs =
    Number.isFinite(timeoutRaw) && timeoutRaw > 0 ? timeoutRaw : 30_000;

  return {
    osrmBaseUrl,
    nominatimBaseUrl,
    nominatimCountryCodes,
    roadFactor,
    userAgent,
    requestTimeoutMs,
  };
}
