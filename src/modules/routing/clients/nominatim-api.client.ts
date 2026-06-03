import { Injectable, Logger } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';
import { getRoutingConfig } from '../routing.config';
import type { GeocodedLocation } from '../types/nominatim.types';
import type { NominatimSearchResult } from '../types/nominatim.types';

@Injectable()
export class NominatimApiClient {
  private readonly logger = new Logger(NominatimApiClient.name);

  constructor(private readonly http: HttpService) {}

  async geocodeAddress(address: string): Promise<GeocodedLocation> {
    const query = address.trim();
    if (!query) {
      throw new Error('Address is required');
    }

    const config = getRoutingConfig();
    const url = `${config.nominatimBaseUrl}/search`;

    this.logger.debug(`Geocoding address: ${query}`);

    const params: Record<string, string | number> = {
      q: query,
      format: 'json',
      limit: 1,
    };
    params.countrycodes = config.nominatimCountryCodes;

    const { data } = await firstValueFrom(
      this.http.get<NominatimSearchResult[]>(url, {
        params,
        headers: {
          'User-Agent': config.userAgent,
          Accept: 'application/json',
        },
      }),
    );

    const match = data?.[0];
    if (!match) {
      throw new Error(
        `Could not find coordinates for "${query}" in the United Kingdom or Pakistan`,
      );
    }

    const latitude = Number(match.lat);
    const longitude = Number(match.lon);
    if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
      throw new Error(`Invalid coordinates returned for "${query}"`);
    }

    return {
      address: match.display_name,
      latitude,
      longitude,
    };
  }
}
