import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import {
  BOOKING_CREATED_EVENT,
  BookingCreatedEvent,
} from '../../../common/events/booking-created.event';
import { BookingWhatsappService } from '../booking-whatsapp.service';

@Injectable()
export class BookingCreatedListener {
  private readonly logger = new Logger(BookingCreatedListener.name);

  constructor(private readonly bookingWhatsapp: BookingWhatsappService) {}

  @OnEvent(BOOKING_CREATED_EVENT, { async: true })
  async handleBookingCreated(event: BookingCreatedEvent): Promise<void> {
    try {
      const result = await this.bookingWhatsapp.sendBookingConfirmation(
        event.booking,
      );
      if (!result.sent) {
        this.logger.warn(
          `Booking ${event.booking.bookingRef}: WhatsApp not sent — ${result.skippedReason ?? 'unknown'}`,
        );
      }
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'WhatsApp send failed';
      this.logger.error(
        `Booking ${event.booking.bookingRef}: WhatsApp handler error — ${message}`,
      );
    }
  }
}
