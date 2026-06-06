import {
  BadRequestException,
  Injectable,
  Logger,
} from '@nestjs/common';
import {
  calculateAllFares,
  calculateAllFaresFromMeters,
  calculateFare,
  kmFromRoundedMiles,
  metersToMiles,
  roundMiles,
  type VehicleType,
} from '../../common/pricing/pricing';
import { estimateDrivingMiles, haversineMiles } from '../../common/utils/geo.util';
import { getRoutingConfig } from './routing.config';
import { OsrmApiClient } from './clients/osrm-api.client';
import { NominatimApiClient } from './clients/nominatim-api.client';
import type { RouteFareDto, RouteQuoteDto } from './dto/route-quote.dto';
import type { GeocodedLocation } from './types/nominatim.types';

type ResolvedWaypoint = {
  input: string;
  location: GeocodedLocation;
};

export type RouteQuoteResult = {
  from: GeocodedLocation;
  to: GeocodedLocation;
  via?: GeocodedLocation;
  distanceMeters: number;
  distanceMiles: number;
  distanceKm: number;
  durationSeconds: number;
  durationMinutes: number;
  vehicleType: VehicleType;
  estimatedFare: number;
  fares: Record<VehicleType, number>;
};

@Injectable()
export class RoutingService {
  private readonly logger = new Logger(RoutingService.name);

  constructor(
    private readonly nominatim: NominatimApiClient,
    private readonly osrm: OsrmApiClient,
  ) {}

  async getQuote(dto: RouteQuoteDto): Promise<RouteQuoteResult> {
    const viaInput = this.normalizeVia(dto.via);
    const waypoints = await this.resolveWaypoints([
      { label: 'pickup', input: dto.from },
      ...(viaInput ? [{ label: 'via', input: viaInput }] : []),
      { label: 'drop-off', input: dto.to },
    ]);

    const route = await this.getDrivingRouteSafe(
      waypoints.map(({ location }) => ({
        latitude: location.latitude,
        longitude: location.longitude,
      })),
    );

    const resolvedMeters = this.resolveDistanceMeters(
      route.distanceMeters,
      waypoints[0].location,
      waypoints[waypoints.length - 1].location,
    );

    const distanceMiles = roundMiles(resolvedMeters);
    const distanceKm = kmFromRoundedMiles(distanceMiles);
    const durationMinutes = Math.round(route.durationSeconds / 60);
    const fares = calculateAllFaresFromMeters(resolvedMeters);

    return {
      from: waypoints[0].location,
      to: waypoints[waypoints.length - 1].location,
      via: viaInput ? waypoints[1].location : undefined,
      distanceMeters: resolvedMeters,
      distanceMiles,
      distanceKm,
      durationSeconds: route.durationSeconds,
      durationMinutes,
      vehicleType: dto.vehicleType,
      estimatedFare: fares[dto.vehicleType],
      fares,
    };
  }

  getFare(dto: RouteFareDto) {
    const distanceMiles = Math.round(Math.max(0, dto.distanceMiles));
    const distanceKm = kmFromRoundedMiles(distanceMiles);
    const estimatedFare = calculateFare(distanceMiles, dto.vehicleType);

    return {
      distanceMiles,
      distanceKm,
      vehicleType: dto.vehicleType,
      estimatedFare,
      fares: calculateAllFares(distanceMiles),
    };
  }

  private normalizeVia(via?: string): string | undefined {
    const trimmed = via?.trim();
    if (!trimmed || trimmed.toLowerCase() === 'car') {
      return undefined;
    }
    return trimmed;
  }

  private async resolveWaypoints(
    points: Array<{ label: string; input: string }>,
  ): Promise<ResolvedWaypoint[]> {
    const resolved: ResolvedWaypoint[] = [];

    for (const point of points) {
      try {
        const location = await this.nominatim.geocodeAddress(point.input);
        resolved.push({ input: point.input, location });
      } catch (error) {
        const detail =
          error instanceof Error ? error.message : 'Geocoding failed';
        this.logger.warn(`Geocoding failed for ${point.label}: ${detail}`);
        throw new BadRequestException(
          `Could not locate the ${point.label} address "${point.input}" in the United Kingdom or Pakistan. Please check the spelling and try again.`,
        );
      }
    }

    return resolved;
  }

  /**
   * Public OSRM often lacks full road networks outside Europe. When the routed
   * distance is barely longer than straight-line, use crow-flies × road factor.
   */
  private resolveDistanceMeters(
    osrmMeters: number,
    from: GeocodedLocation,
    to: GeocodedLocation,
  ): number {
    const config = getRoutingConfig();
    const straightMiles = haversineMiles(from, to);
    const osrmMiles = metersToMiles(osrmMeters);

    if (straightMiles <= 0) {
      return osrmMeters;
    }

    const osrmLooksIncomplete = osrmMiles <= straightMiles * 1.12;
    if (!osrmLooksIncomplete) {
      return osrmMeters;
    }

    const estimatedMiles = estimateDrivingMiles(from, to, config.roadFactor);
    this.logger.debug(
      `OSRM ${osrmMiles.toFixed(1)} mi ≈ straight line; using estimated ${estimatedMiles.toFixed(1)} mi (×${config.roadFactor})`,
    );
    return estimatedMiles * 1609.344;
  }

  private async getDrivingRouteSafe(
    coordinates: Array<{ latitude: number; longitude: number }>,
  ) {
    try {
      return await this.osrm.getDrivingRoute(coordinates);
    } catch (error) {
      const detail =
        error instanceof Error ? error.message : 'Routing request failed';
      this.logger.warn(`OSRM routing failed: ${detail}`);
      throw new BadRequestException(
        'We could not calculate a driving route for this journey. Please check the addresses and try again.',
      );
    }
  }
}
