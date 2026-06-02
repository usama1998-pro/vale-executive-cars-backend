import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import type { Booking } from '@prisma/client';
import { PrismaService } from '../../core/database/prisma.service';
import { getWhatsappConfig } from './whatsapp.config';
import { resolveOwnerWhatsappTo } from './utils/phone.util';
import {
  sanitizeTemplateParameter,
  UTILITY_TEMPLATE_TEXT_MAX_LENGTH,
} from './utils/template-parameter.util';
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

  private formatPickupLabels(pickupAt: Date): {
    pickupDateLabel: string;
    pickupTimeLabel: string;
  } {
    const timeZone = process.env.TZ || 'Europe/London';
    const pickupDateLabel = pickupAt.toLocaleDateString('en-GB', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
      timeZone,
    });
    const pickupTimeLabel = pickupAt.toLocaleTimeString('en-GB', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
      timeZone,
    });
    return { pickupDateLabel, pickupTimeLabel };
  }

  /**
   * Template {{3}} for owner: vehicle + customer contact (max 30 chars).
   */
  private ownerServiceLabel(booking: Booking): string {
    const vehicle = booking.vehicleType?.trim();
    const contactDigits = booking.contactNumber.replace(/\D/g, '');
    const contactShort = contactDigits.slice(-11);
    const route = vehicle
      ? `${vehicle} · ${contactShort}`
      : contactShort || 'New booking';
    return sanitizeTemplateParameter(route, UTILITY_TEMPLATE_TEXT_MAX_LENGTH);
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

    const { pickupDateLabel, pickupTimeLabel } = this.formatPickupLabels(
      booking.preferredPickupAt,
    );

    return this.messaging.sendBookingConfirmationTemplate({
      to,
      customerName: booking.customerName,
      serviceLabel: this.ownerServiceLabel(booking),
      pickupDateLabel,
      pickupTimeLabel,
      businessName: config.businessName,
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
