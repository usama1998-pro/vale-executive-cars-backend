export const VEHICLE_TYPES = ['saloon', 'executive', 'mpv'] as const;
export type VehicleType = (typeof VEHICLE_TYPES)[number];

export const PRICING = {
  saloon: {
    label: 'PREMIUM VEHICLE',
    firstMiles: 3,
    firstRate: 7.5,
    additionalRate: 3,
  },
  executive: {
    label: 'EXECUTIVE VEHICLE',
    perMile: 7.5,
  },
  mpv: {
    label: 'EXECUTIVE MPV (7 Seater)',
    firstMiles: 3,
    firstRate: 10,
    additionalRate: 7.5,
  },
} as const;

export function isVehicleType(value: string): value is VehicleType {
  return (VEHICLE_TYPES as readonly string[]).includes(value);
}

export function calculateSaloonFare(miles: number): number {
  if (miles <= 0) return 0;
  if (miles <= PRICING.saloon.firstMiles) {
    return miles * PRICING.saloon.firstRate;
  }
  const firstLeg = PRICING.saloon.firstMiles * PRICING.saloon.firstRate;
  const additional =
    (miles - PRICING.saloon.firstMiles) * PRICING.saloon.additionalRate;
  return firstLeg + additional;
}

export function calculateExecutiveFare(miles: number): number {
  if (miles <= 0) return 0;
  return miles * PRICING.executive.perMile;
}

export function calculateMpvFare(miles: number): number {
  if (miles <= 0) return 0;
  if (miles <= PRICING.mpv.firstMiles) {
    return miles * PRICING.mpv.firstRate;
  }
  const firstLeg = PRICING.mpv.firstMiles * PRICING.mpv.firstRate;
  const additional = (miles - PRICING.mpv.firstMiles) * PRICING.mpv.additionalRate;
  return firstLeg + additional;
}

/** Round a monetary amount to whole pence (2 decimal places). */
export function roundToPence(amount: number): number {
  return Math.round(amount * 100) / 100;
}

/** Fare in pounds to 2 decimal places (exact pence, priced on exact miles). */
export function calculateFare(miles: number, vehicleType: VehicleType): number {
  const exactMiles = Math.max(0, miles);
  let fare = 0;
  switch (vehicleType) {
    case 'saloon':
      fare = calculateSaloonFare(exactMiles);
      break;
    case 'executive':
      fare = calculateExecutiveFare(exactMiles);
      break;
    case 'mpv':
      fare = calculateMpvFare(exactMiles);
      break;
    default:
      fare = 0;
  }
  return roundToPence(fare);
}

export function calculateAllFares(miles: number): Record<VehicleType, number> {
  return {
    saloon: calculateFare(miles, 'saloon'),
    executive: calculateFare(miles, 'executive'),
    mpv: calculateFare(miles, 'mpv'),
  };
}

export function metersToKm(meters: number): number {
  return meters / 1000;
}

export function metersToMiles(meters: number): number {
  return meters / 1609.344;
}

/** Exact journey miles to 2 decimal places (no whole-mile rounding). */
export function milesFromMeters(meters: number): number {
  return Math.round(metersToMiles(meters) * 100) / 100;
}

/** Km equivalent (2 dp) for API consumers that still read distanceKm. */
export function kmFromMiles(miles: number): number {
  return Math.round(Math.max(0, miles) * 1.609344 * 100) / 100;
}

/** Fare uses mile-based rates on exact mileage. */
export function calculateAllFaresFromMeters(
  distanceMeters: number,
): Record<VehicleType, number> {
  return calculateAllFares(milesFromMeters(distanceMeters));
}
