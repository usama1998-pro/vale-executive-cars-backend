import {
  BadRequestException,
  Injectable,
  InternalServerErrorException,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { BookingStatus, Prisma, type Booking } from '@prisma/client';
import {
  BOOKING_CREATED_EVENT,
  BookingCreatedEvent,
} from '../../common/events/booking-created.event';
import { API_MESSAGES } from '../../common/messages/api-messages';
import { assertNoUniqueViolation } from '../../common/utils/prisma-error.util';
import {
  generateNumericBookingRef,
  isNumericBookingRef,
} from '../../common/utils/booking-ref.util';
import { PrismaService } from '../../core/database/prisma.service';
import { CreateBookingDto } from './dto/create-booking.dto';
import { ListBookingsQueryDto } from './dto/list-bookings-query.dto';
import { UpdateBookingDto } from './dto/update-booking.dto';

export type BookingResponse = {
  /** Primary key (UUID v4). */
  id: string;
  /** Same as `id` — explicit UUID for clients. */
  uuid: string;
  /** Short numeric reference for customers, e.g. `482917`. */
  bookingRef: string;
  customerName: string;
  email: string;
  contactNumber: string;
  from: string;
  roomNo: string | null;
  passengers: number | null;
  to: string;
  distanceMiles: number;
  estimatedFare: number;
  vehicleType: string;
  tripType: 'one-way' | 'return';
  via: string;
  preferredPickupAt: string;
  returnPickupAt: string | null;
  status: BookingStatus;
  submittedAt: string;
  resolvedAt: string | null;
  createdAt: string;
  updatedAt: string;
};

export type PaginatedBookingsResponse = {
  data: BookingResponse[];
  meta: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
};

@Injectable()
export class BookingsService {
  private readonly logger = new Logger(BookingsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly events: EventEmitter2,
  ) {}

  private async allocateBookingRef(provided?: string): Promise<string> {
    if (provided?.trim()) {
      const ref = provided.trim();
      if (!isNumericBookingRef(ref)) {
        throw new BadRequestException(
          'bookingRef must be numeric only (4–10 digits)',
        );
      }
      return ref;
    }

    for (let attempt = 0; attempt < 15; attempt++) {
      const ref = generateNumericBookingRef();
      const taken = await this.prisma.booking.findUnique({
        where: { bookingRef: ref },
        select: { id: true },
      });
      if (!taken) {
        return ref;
      }
    }

    throw new InternalServerErrorException(
      'Could not allocate a unique booking reference',
    );
  }

  private normalizeTripType(raw?: string): 'one-way' | 'return' {
    if (!raw) return 'one-way';
    const value = raw.trim().toLowerCase();
    if (value === 'one-way' || value === 'return') {
      return value;
    }
    throw new BadRequestException('tripType must be either "one-way" or "return"');
  }

  private toResponse(row: Booking): BookingResponse {
    return {
      id: row.id,
      uuid: row.id,
      bookingRef: row.bookingRef,
      customerName: row.customerName,
      email: row.email,
      contactNumber: row.contactNumber,
      from: row.pickupFrom,
      roomNo: row.roomNo,
      passengers: row.passengers,
      to: row.dropoffTo,
      distanceMiles: row.distanceMiles,
      estimatedFare: row.estimatedFare,
      vehicleType: row.vehicleType,
      tripType: this.normalizeTripType(row.tripType),
      via: row.via,
      preferredPickupAt: row.preferredPickupAt.toISOString(),
      returnPickupAt: row.returnPickupAt?.toISOString() ?? null,
      status: row.status,
      submittedAt: row.submittedAt.toISOString(),
      resolvedAt: row.resolvedAt?.toISOString() ?? null,
      createdAt: row.createdAt.toISOString(),
      updatedAt: row.updatedAt.toISOString(),
    };
  }

  async create(dto: CreateBookingDto): Promise<BookingResponse> {
    const bookingRef = await this.allocateBookingRef(dto.bookingRef);
    const status = dto.status ?? BookingStatus.submitted;
    const submittedAt = dto.submittedAt
      ? new Date(dto.submittedAt)
      : new Date();
    const resolvedAt =
      status === BookingStatus.accepted ||
      status === BookingStatus.rejected ||
      status === BookingStatus.completed ||
      status === BookingStatus.cancelled
        ? new Date()
        : null;

    const tripType = this.normalizeTripType(dto.tripType);
    if (tripType === 'return' && !dto.returnPickupAt) {
      throw new BadRequestException(
        'returnPickupAt is required when tripType is "return"',
      );
    }

    try {
      const row = await this.prisma.booking.create({
        data: {
          bookingRef,
          customerName: dto.customerName.trim(),
          email: dto.email.trim().toLowerCase(),
          contactNumber: dto.contactNumber.trim(),
          pickupFrom: dto.from.trim(),
          roomNo: dto.roomNo?.trim() || null,
          passengers: dto.passengers ?? null,
          dropoffTo: dto.to.trim(),
          distanceMiles: dto.distanceMiles,
          estimatedFare: dto.estimatedFare,
          vehicleType: dto.vehicleType.trim(),
          tripType,
          via: dto.via.trim(),
          preferredPickupAt: new Date(dto.preferredPickupAt),
          returnPickupAt: dto.returnPickupAt ? new Date(dto.returnPickupAt) : null,
          status,
          submittedAt,
          resolvedAt,
        },
      });
      this.logger.log(
        `Booking created ref=${row.bookingRef} email=${row.email} vehicle=${row.vehicleType}`,
      );
      this.emitBookingCreated(row);
      return this.toResponse(row);
    } catch (e) {
      assertNoUniqueViolation(e, API_MESSAGES.booking.refConflict);
      throw e;
    }
  }

  private buildListWhere(query: ListBookingsQueryDto): Prisma.BookingWhereInput {
    const where: Prisma.BookingWhereInput = {};

    if (query.status) {
      where.status = query.status;
    }

    if (query.dateFrom || query.dateTo) {
      where.createdAt = {};
      if (query.dateFrom) {
        where.createdAt.gte = new Date(query.dateFrom);
      }
      if (query.dateTo) {
        where.createdAt.lte = new Date(query.dateTo);
      }
    }

    if (query.from?.trim()) {
      where.pickupFrom = {
        contains: query.from.trim(),
      };
    }

    if (query.to?.trim()) {
      where.dropoffTo = {
        contains: query.to.trim(),
      };
    }

    if (query.email?.trim()) {
      where.email = {
        contains: query.email.trim().toLowerCase(),
      };
    }

    if (query.customerName?.trim()) {
      where.customerName = {
        contains: query.customerName.trim(),
      };
    }

    if (query.bookingRef?.trim()) {
      where.bookingRef = {
        contains: query.bookingRef.trim(),
      };
    }

    return where;
  }

  async findAll(query: ListBookingsQueryDto): Promise<PaginatedBookingsResponse> {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const skip = (page - 1) * limit;
    const where = this.buildListWhere(query);

    const [total, rows] = await Promise.all([
      this.prisma.booking.count({ where }),
      this.prisma.booking.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
    ]);

    return {
      data: rows.map((row) => this.toResponse(row)),
      meta: {
        page,
        limit,
        total,
        totalPages: total === 0 ? 0 : Math.ceil(total / limit),
      },
    };
  }

  async findOne(id: string): Promise<BookingResponse> {
    const row = await this.prisma.booking.findUnique({ where: { id } });
    if (!row) {
      throw new NotFoundException(API_MESSAGES.booking.notFound);
    }
    return this.toResponse(row);
  }

  async findByRef(bookingRef: string): Promise<BookingResponse> {
    const row = await this.prisma.booking.findUnique({
      where: { bookingRef: bookingRef.trim() },
    });
    if (!row) {
      throw new NotFoundException(API_MESSAGES.booking.notFound);
    }
    return this.toResponse(row);
  }

  async update(id: string, dto: UpdateBookingDto): Promise<BookingResponse> {
    await this.findOne(id);

    const data: Prisma.BookingUpdateInput = {};
    if (dto.customerName !== undefined) {
      data.customerName = dto.customerName.trim();
    }
    if (dto.email !== undefined) {
      data.email = dto.email.trim().toLowerCase();
    }
    if (dto.contactNumber !== undefined) {
      data.contactNumber = dto.contactNumber.trim();
    }
    if (dto.from !== undefined) {
      data.pickupFrom = dto.from.trim();
    }
    if (dto.roomNo !== undefined) {
      data.roomNo = dto.roomNo.trim() || null;
    }
    if (dto.passengers !== undefined) {
      data.passengers = dto.passengers;
    }
    if (dto.to !== undefined) {
      data.dropoffTo = dto.to.trim();
    }
    if (dto.distanceMiles !== undefined) {
      data.distanceMiles = dto.distanceMiles;
    }
    if (dto.estimatedFare !== undefined) {
      data.estimatedFare = dto.estimatedFare;
    }
    if (dto.vehicleType !== undefined) {
      data.vehicleType = dto.vehicleType.trim();
    }
    if (dto.via !== undefined) {
      data.via = dto.via.trim();
    }
    if (dto.preferredPickupAt !== undefined) {
      data.preferredPickupAt = new Date(dto.preferredPickupAt);
    }
    if (dto.tripType !== undefined) {
      const tripType = this.normalizeTripType(dto.tripType);
      data.tripType = tripType;
      if (tripType === 'one-way' && dto.returnPickupAt === undefined) {
        data.returnPickupAt = null;
      }
    }
    if (dto.returnPickupAt !== undefined) {
      data.returnPickupAt = new Date(dto.returnPickupAt);
    }
    if (dto.status !== undefined) {
      data.status = dto.status;
      if (
        dto.resolvedAt === undefined &&
        (dto.status === BookingStatus.accepted ||
          dto.status === BookingStatus.rejected ||
          dto.status === BookingStatus.completed ||
          dto.status === BookingStatus.cancelled)
      ) {
        data.resolvedAt = new Date();
      }
    }
    if (dto.resolvedAt !== undefined) {
      data.resolvedAt =
        dto.resolvedAt === null ? null : new Date(dto.resolvedAt);
    }

    const row = await this.prisma.booking.update({ where: { id }, data });
    return this.toResponse(row);
  }

  async remove(id: string): Promise<{ id: string; bookingRef: string }> {
    const row = await this.prisma.booking.findUnique({ where: { id } });
    if (!row) {
      throw new NotFoundException(API_MESSAGES.booking.notFound);
    }
    await this.prisma.booking.delete({ where: { id } });
    this.logger.log(`Booking deleted ref=${row.bookingRef} id=${row.id}`);
    return { id: row.id, bookingRef: row.bookingRef };
  }

  /** Fire-and-forget; failures must not affect the booking API response. */
  private emitBookingCreated(booking: Booking): void {
    try {
      this.events.emit(BOOKING_CREATED_EVENT, new BookingCreatedEvent(booking));
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'event emit failed';
      this.logger.warn(
        `Could not emit ${BOOKING_CREATED_EVENT} for ${booking.bookingRef}: ${message}`,
      );
    }
  }
}
