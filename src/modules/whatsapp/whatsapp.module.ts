import { HttpModule } from '@nestjs/axios';
import { Module } from '@nestjs/common';
import { BookingWhatsappService } from './booking-whatsapp.service';
import { BookingCreatedListener } from './listeners/booking-created.listener';
import { MetaTokenService } from './meta-token.service';
import { WhatsappApiClient } from './whatsapp-api.client';
import { WhatsappController } from './whatsapp.controller';
import { WhatsappMessagingService } from './whatsapp-messaging.service';

@Module({
  imports: [
    HttpModule.register({
      timeout: 30_000,
      maxRedirects: 0,
    }),
  ],
  controllers: [WhatsappController],
  providers: [
    MetaTokenService,
    WhatsappApiClient,
    WhatsappMessagingService,
    BookingWhatsappService,
    BookingCreatedListener,
  ],
  exports: [BookingWhatsappService, WhatsappMessagingService, WhatsappApiClient],
})
export class WhatsappModule {}
