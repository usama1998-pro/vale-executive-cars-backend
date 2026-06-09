import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import {
  calculateAllFares,
  calculateAllFaresFromMeters,
  calculateFare,
  kmFromRoundedMiles,
  roundMiles,
  type VehicleType,
} from '../../common/pricing/pricing';
import { API_MESSAGES } from '../../common/messages/api-messages';
import { GoogleDirectionsApiClient } from './clients/google-directions-api.client';
import { GoogleGeocodingApiClient } from './clients/google-geocoding-api.client';
import { GooglePlacesApiClient } from './clients/google-places-api.client';
import type { RouteFareDto, RouteQuoteDto } from './dto/route-quote.dto';
import type { GeocodedLocation } from './types/google-maps.types';

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
    private readonly geocoding: GoogleGeocodingApiClient,
    private readonly directions: GoogleDirectionsApiClient,
    private readonly places: GooglePlacesApiClient,
  ) {}

  async getQuote(dto: RouteQuoteDto): Promise<RouteQuoteResult> {
    const viaInput = this.normalizeVia(dto.via);
    const waypoints = await this.resolveWaypoints([
      { label: 'pickup', input: dto.from },
      ...(viaInput ? [{ label: 'via', input: viaInput }] : []),
      { label: 'drop-off', input: dto.to },
    ]);

    const route = viaInput
      ? await this.getViaRouteTotals(waypoints)
      : await this.getDrivingRouteSafe(
          waypoints.map(({ location }) => ({
            latitude: location.latitude,
            longitude: location.longitude,
          })),
        );

    const distanceMiles = roundMiles(route.distanceMeters);
    const distanceKm = kmFromRoundedMiles(distanceMiles);
    const durationMinutes = Math.round(route.durationSeconds / 60);
    const fares = calculateAllFaresFromMeters(route.distanceMeters);

    return {
      from: waypoints[0].location,
      to: waypoints[waypoints.length - 1].location,
      via: viaInput ? waypoints[1].location : undefined,
      distanceMeters: route.distanceMeters,
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

  searchPlaces(input: string) {
    return this.places.searchPlaces(input);
  }

  /**
   * Via journeys: sum Pickup→Via and Via→Drop-off distances, then price once
   * on the combined total miles.
   */
  private async getViaRouteTotals(waypoints: ResolvedWaypoint[]) {
    const pickup = waypoints[0].location;
    const via = waypoints[1].location;
    const dropoff = waypoints[waypoints.length - 1].location;

    const toCoordinate = (location: GeocodedLocation) => ({
      latitude: location.latitude,
      longitude: location.longitude,
    });

    const [pickupToVia, viaToDropoff] = await Promise.all([
      this.getDrivingRouteSafe([toCoordinate(pickup), toCoordinate(via)]),
      this.getDrivingRouteSafe([toCoordinate(via), toCoordinate(dropoff)]),
    ]);

    const distanceMeters =
      pickupToVia.distanceMeters + viaToDropoff.distanceMeters;

    this.logger.debug(
      `Via route: pickup→via ${roundMiles(pickupToVia.distanceMeters)} mi + via→drop-off ${roundMiles(viaToDropoff.distanceMeters)} mi = ${roundMiles(distanceMeters)} mi total`,
    );

    return {
      distanceMeters,
      durationSeconds:
        pickupToVia.durationSeconds + viaToDropoff.durationSeconds,
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
        const location = await this.geocoding.geocodeAddress(point.input);
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

  private async getDrivingRouteSafe(
    coordinates: Array<{ latitude: number; longitude: number }>,
  ) {
    try {
      return await this.directions.getDrivingRoute(coordinates);
    } catch (error) {
      const detail =
        error instanceof Error ? error.message : 'Routing request failed';
      this.logger.warn(`Google Directions routing failed: ${detail}`);
      throw new BadRequestException(API_MESSAGES.routing.routeFailed);
    }
  }
}
