import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import type { Booking } from '@prisma/client';
import { PrismaService } from '../../core/database/prisma.service';
import { getWhatsappConfig } from './whatsapp.config';
import { resolveOwnerWhatsappTo } from './utils/phone.util';
import {
  WhatsappMessagingService,
  type WhatsappSendResult,
} from './whatsapp-messaging.service';

@Injectable()
export class BookingWhatsappService {
  private readonly logger = new Logger(BookingWhatsappService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly messaging: WhatsappMessagingService,
  ) {}

  private formatTravelDateLabel(pickupAt: Date): string {
    const timeZone = process.env.TZ || 'Europe/London';
    const dateLabel = pickupAt.toLocaleDateString('en-GB', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
      timeZone,
    });
    const timeLabel = pickupAt.toLocaleTimeString('en-GB', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
      timeZone,
    });
    return `${dateLabel} at ${timeLabel}`;
  }

  private formatStopoverLocation(via: string): string {
    const trimmed = via.trim();
    if (!trimmed || trimmed.toLowerCase() === 'car') {
      return 'None';
    }
    return trimmed;
  }

  async sendBookingConfirmation(booking: Booking): Promise<WhatsappSendResult> {
    const config = getWhatsappConfig();
    if (!config?.enabled) {
      return {
        sent: false,
        skippedReason: 'WhatsApp not configured or disabled',
      };
    }

    const to = resolveOwnerWhatsappTo(
      config.whatsappTo,
      config.defaultCountryCode,
    );
    if (!to) {
      return {
        sent: false,
        skippedReason:
          'WHATSAPP_TO is not set or invalid (required owner notification number)',
      };
    }

    this.logger.log(
      `WhatsApp owner notify → ${to} | ref=${booking.bookingRef} customer=${booking.customerName} contact=${booking.contactNumber}`,
    );

    return this.messaging.sendBookingConfirmationTemplate({
      to,
      customerName: booking.customerName,
      contactNumber: booking.contactNumber,
      email: booking.email,
      departureLocation: booking.pickupFrom,
      stopoverLocation: this.formatStopoverLocation(booking.via),
      destinationLocation: booking.dropoffTo,
      travelDateLabel: this.formatTravelDateLabel(booking.preferredPickupAt),
    });
  }

  async sendBookingConfirmationById(
    bookingId: string,
    overrides?: { preferredPickupAt?: Date },
  ): Promise<WhatsappSendResult> {
    const booking = await this.prisma.booking.findUnique({
      where: { id: bookingId },
    });
    if (!booking) {
      throw new NotFoundException(`Booking ${bookingId} not found`);
    }
    if (overrides?.preferredPickupAt) {
      booking.preferredPickupAt = overrides.preferredPickupAt;
    }
    return this.sendBookingConfirmation(booking);
  }
}
