import { Injectable, Logger } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';
import { getRoutingConfig } from '../routing.config';
import type { OsrmCoordinate, OsrmRouteResponse } from '../types/osrm.types';

export type OsrmRouteResult = {
  distanceMeters: number;
  durationSeconds: number;
};

@Injectable()
export class OsrmApiClient {
  private readonly logger = new Logger(OsrmApiClient.name);

  constructor(private readonly http: HttpService) {}

  async getDrivingRoute(
    coordinates: OsrmCoordinate[],
  ): Promise<OsrmRouteResult> {
    if (coordinates.length < 2) {
      throw new Error('At least two coordinates are required for routing');
    }

    const config = getRoutingConfig();
    const coordinatePath = coordinates
      .map(({ longitude, latitude }) => `${longitude},${latitude}`)
      .join(';');
    const url = `${config.osrmBaseUrl}/${coordinatePath}`;

    this.logger.debug(`OSRM route request: ${url}`);

    const { data } = await firstValueFrom(
      this.http.get<OsrmRouteResponse>(url, {
        params: { overview: 'false' },
        headers: { Accept: 'application/json' },
      }),
    );

    if (data.code !== 'Ok') {
      throw new Error(
        data.message || `OSRM routing failed with code "${data.code}"`,
      );
    }

    const route = data.routes?.[0];
    if (!route) {
      throw new Error('OSRM returned no route');
    }

    return {
      distanceMeters: route.distance,
      durationSeconds: route.duration,
    };
  }
}
