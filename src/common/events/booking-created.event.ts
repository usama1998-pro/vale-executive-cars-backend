import type { Booking } from '@prisma/client';

export const BOOKING_CREATED_EVENT = 'booking.created';

/** Emitted after a booking is persisted. WhatsApp (and other listeners) subscribe separately. */
export class BookingCreatedEvent {
  constructor(public readonly booking: Booking) {}
}
