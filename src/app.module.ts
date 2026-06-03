import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { ThrottlerModule } from '@nestjs/throttler';
import { CoreModule } from './core/core.module';
import { AppThrottlerGuard } from './core/throttler/app-throttler.guard';
import { getThrottleLimit, getThrottleTtlMs } from './core/throttler/throttler.config';
import { AuthModule } from './modules/auth/auth.module';
import { BookingsModule } from './modules/bookings/bookings.module';
import { UsersModule } from './modules/users/users.module';
import { WhatsappModule } from './modules/whatsapp/whatsapp.module';
import { RoutingModule } from './modules/routing/routing.module';

@Module({
  imports: [
    ThrottlerModule.forRoot({
      throttlers: [
        {
          ttl: getThrottleTtlMs(),
          limit: getThrottleLimit(),
        },
      ],
    }),
    EventEmitterModule.forRoot(),
    CoreModule,
    AuthModule,
    BookingsModule,
    UsersModule,
    WhatsappModule,
    RoutingModule,
  ],
  providers: [
    {
      provide: APP_GUARD,
      useClass: AppThrottlerGuard,
    },
  ],
})
export class AppModule {}
