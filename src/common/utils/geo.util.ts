/** Great-circle distance between two points, in kilometres. */
export function haversineKm(
  from: { latitude: number; longitude: number },
  to: { latitude: number; longitude: number },
): number {
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const earthRadiusKm = 6371;
  const dLat = toRad(to.latitude - from.latitude);
  const dLon = toRad(to.longitude - from.longitude);
  const lat1 = toRad(from.latitude);
  const lat2 = toRad(to.latitude);

  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLon / 2) ** 2;
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return earthRadiusKm * c;
}

/**
 * When OSRM returns a route close to straight-line distance, road data is often
 * incomplete. Estimate driving distance as crow-flies × road factor.
 */
export function estimateDrivingKm(
  from: { latitude: number; longitude: number },
  to: { latitude: number; longitude: number },
  roadFactor: number,
): number {
  return haversineKm(from, to) * roadFactor;
}
