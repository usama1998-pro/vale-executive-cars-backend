import { HttpModule } from '@nestjs/axios';
import { Module } from '@nestjs/common';
import { getRoutingConfig } from './routing.config';
import { NominatimApiClient } from './clients/nominatim-api.client';
import { OsrmApiClient } from './clients/osrm-api.client';
import { RoutingController } from './routing.controller';
import { RoutingService } from './routing.service';

@Module({
  imports: [
    HttpModule.registerAsync({
      useFactory: () => {
        const { requestTimeoutMs } = getRoutingConfig();
        return {
          timeout: requestTimeoutMs,
          maxRedirects: 0,
        };
      },
    }),
  ],
  controllers: [RoutingController],
  providers: [NominatimApiClient, OsrmApiClient, RoutingService],
  exports: [RoutingService, OsrmApiClient, NominatimApiClient],
})
export class RoutingModule {}
