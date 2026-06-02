import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { ApiSuccessMessage } from '../../common/decorators/api-success-message.decorator';
import { API_MESSAGES } from '../../common/messages/api-messages';
import { ApiAccessTokenInSwagger } from '../../core/swagger/api-access-token.decorator';
import { Public } from '../auth/decorators/public.decorator';
import { StaffAdminGuard } from '../auth/guards/staff-admin.guard';
import { BookingsService } from './bookings.service';
import { CreateBookingDto } from './dto/create-booking.dto';
import { ListBookingsQueryDto } from './dto/list-bookings-query.dto';
import { UpdateBookingDto } from './dto/update-booking.dto';

@ApiTags('bookings')
@Controller('bookings')
export class BookingsController {
  constructor(private readonly bookings: BookingsService) {}

  @Public()
  @Post()
  @ApiOperation({
    summary: 'Submit a booking request',
    description:
      'Public endpoint. `id`/`uuid` are UUIDs; `bookingRef` is a short numeric code (auto-generated if omitted).',
  })
  @ApiResponse({ status: 409, description: 'Booking reference already exists' })
  @ApiSuccessMessage(API_MESSAGES.booking.created)
  create(@Body() dto: CreateBookingDto) {
    return this.bookings.create(dto);
  }

  @Get()
  @UseGuards(StaffAdminGuard)
  @ApiAccessTokenInSwagger()
  @ApiOperation({
    summary: 'List bookings (admin)',
    description:
      'Paginated list with optional filters: dateFrom, dateTo (on createdAt), status, from, to, email, customerName, bookingRef.',
  })
  findAll(@Query() query: ListBookingsQueryDto) {
    return this.bookings.findAll(query);
  }

  @Get('ref/:bookingRef')
  @UseGuards(StaffAdminGuard)
  @ApiAccessTokenInSwagger()
  @ApiOperation({ summary: 'Get booking by reference (admin)' })
  @ApiSuccessMessage(API_MESSAGES.booking.getSuccess)
  findByRef(@Param('bookingRef') bookingRef: string) {
    return this.bookings.findByRef(bookingRef);
  }

  @Get(':id')
  @UseGuards(StaffAdminGuard)
  @ApiAccessTokenInSwagger()
  @ApiOperation({ summary: 'Get booking by id (admin)' })
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.bookings.findOne(id);
  }

  @Patch(':id')
  @UseGuards(StaffAdminGuard)
  @ApiAccessTokenInSwagger()
  @ApiOperation({
    summary: 'Update booking (admin)',
    description: 'Set `status` to accepted/rejected/etc.; `resolvedAt` is set automatically when appropriate.',
  })
  @ApiSuccessMessage(API_MESSAGES.booking.updateSuccess)
  update(@Param('id', ParseUUIDPipe) id: string, @Body() dto: UpdateBookingDto) {
    return this.bookings.update(id, dto);
  }

  @Delete(':id')
  @UseGuards(StaffAdminGuard)
  @ApiAccessTokenInSwagger()
  @ApiOperation({ summary: 'Delete booking (admin)' })
  @ApiSuccessMessage(API_MESSAGES.booking.deleteSuccess)
  remove(@Param('id', ParseUUIDPipe) id: string) {
    return this.bookings.remove(id);
  }
}
