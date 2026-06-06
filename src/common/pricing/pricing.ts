export const VEHICLE_TYPES = ['saloon', 'executive', 'mpv'] as const;
export type VehicleType = (typeof VEHICLE_TYPES)[number];

export const PRICING = {
  saloon: {
    label: 'SALOON',
    firstMiles: 3,
    firstRate: 5,
    additionalRate: 3,
  },
  executive: {
    label: 'EXECUTIVE',
    perMile: 5,
  },
  mpv: {
    label: 'MPV (8 Seater)',
    multiplier: 1.5,
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
  return calculateExecutiveFare(miles) * PRICING.mpv.multiplier;
}

/** Whole pounds (bookings store `estimatedFare` as an integer). */
export function calculateFare(miles: number, vehicleType: VehicleType): number {
  const roundedMiles = Math.max(0, miles);
  let fare = 0;
  switch (vehicleType) {
    case 'saloon':
      fare = calculateSaloonFare(roundedMiles);
      break;
    case 'executive':
      fare = calculateExecutiveFare(roundedMiles);
      break;
    case 'mpv':
      fare = calculateMpvFare(roundedMiles);
      break;
    default:
      fare = 0;
  }
  return Math.round(fare);
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

export function roundMiles(meters: number): number {
  return Math.round(metersToMiles(meters));
}

/** Approximate km equivalent for API consumers that still read distanceKm. */
export function kmFromRoundedMiles(miles: number): number {
  return Math.round(Math.max(0, miles) * 1.609344);
}

/** Fare uses mile-based rates. */
export function calculateAllFaresFromMeters(
  distanceMeters: number,
): Record<VehicleType, number> {
  return calculateAllFares(roundMiles(distanceMeters));
}
