import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import type { Booking } from '@prisma/client';
import {
  isVehicleType,
  PRICING,
} from '../../common/pricing/pricing';
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

  private formatDateTimeLabel(date: Date): string {
    const timeZone = process.env.TZ || 'Europe/London';
    const dateLabel = date.toLocaleDateString('en-GB', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
      timeZone,
    });
    const timeLabel = date.toLocaleTimeString('en-GB', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
      timeZone,
    });
    return `${dateLabel} at ${timeLabel}`;
  }

  private formatReturnDateLabel(returnPickupAt: Date | null | undefined): string {
    return returnPickupAt ? this.formatDateTimeLabel(returnPickupAt) : 'None';
  }

  private formatRoomNo(roomNo: string | null | undefined): string {
    const trimmed = roomNo?.trim();
    return trimmed ? trimmed : 'None';
  }

  private formatNote(note: string | null | undefined): string {
    const trimmed = note?.trim();
    return trimmed ? trimmed : 'None';
  }

  private formatPassengers(passengers: number | null | undefined): string {
    return String(passengers ?? 1);
  }

  private formatSelectedService(vehicleType: string): string {
    if (isVehicleType(vehicleType)) {
      return PRICING[vehicleType].label;
    }
    return vehicleType.trim().toUpperCase() || 'EXECUTIVE';
  }

  private formatTotalFare(estimatedFare: number): string {
    return `£${estimatedFare.toFixed(2)}`;
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
      roomNo: this.formatRoomNo(booking.roomNo),
      passengers: this.formatPassengers(booking.passengers),
      departureLocation: booking.pickupFrom,
      destinationLocation: booking.dropoffTo,
      pickupDateLabel: this.formatDateTimeLabel(booking.preferredPickupAt),
      returnDateLabel: this.formatReturnDateLabel(booking.returnPickupAt),
      selectedService: this.formatSelectedService(booking.vehicleType),
      totalFare: this.formatTotalFare(booking.estimatedFare),
      note: this.formatNote(booking.note),
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
