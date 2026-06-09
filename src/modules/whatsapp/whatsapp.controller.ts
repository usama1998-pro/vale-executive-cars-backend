import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Post,
  Query,
  ServiceUnavailableException,
  UseGuards,
} from '@nestjs/common';
import {
  ApiOperation,
  ApiQuery,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { ApiAccessTokenInSwagger } from '../../core/swagger/api-access-token.decorator';
import { Public } from '../auth/decorators/public.decorator';
import { StaffAdminGuard } from '../auth/guards/staff-admin.guard';
import { SkipApiWrap } from '../../common/decorators/skip-api-wrap.decorator';
import { getWhatsappConfig } from './whatsapp.config';
import { isMetaTokenRefreshEnabled } from './meta-token.config';
import { BookingWhatsappService } from './booking-whatsapp.service';
import {
  SendBookingConfirmationDto,
  TestBookingConfirmationFromBookingDto,
} from './dto/send-booking-confirmation.dto';
import { WhatsappMessagingService } from './whatsapp-messaging.service';
import { resolveOwnerWhatsappTo } from './utils/phone.util';

@ApiTags('whatsapp')
@Controller('whatsapp')
export class WhatsappController {
  constructor(
    private readonly messaging: WhatsappMessagingService,
    private readonly bookingWhatsapp: BookingWhatsappService,
  ) {}

  @Get('status')
  @UseGuards(StaffAdminGuard)
  @ApiAccessTokenInSwagger()
  @ApiOperation({ summary: 'WhatsApp integration status (admin)' })
  status() {
    const config = getWhatsappConfig();
    return {
      configured: Boolean(config),
      enabled: Boolean(config?.enabled),
      tokenRefreshEnabled: isMetaTokenRefreshEnabled(),
      graphApiUrl: config?.graphApiUrl ?? null,
      phoneNumberId: config?.phoneNumberId ?? null,
      template: config?.bookingConfirmationTemplate ?? null,
      language: config?.templateLanguageCode ?? null,
      whatsappToConfigured: Boolean(config?.whatsappTo),
      whatsappTo: config?.whatsappTo ?? null,
    };
  }

  @Public()
  @SkipApiWrap()
  @Get('webhook')
  @ApiOperation({ summary: 'Meta webhook verification' })
  @ApiQuery({ name: 'hub.mode', required: true })
  @ApiQuery({ name: 'hub.verify_token', required: true })
  @ApiQuery({ name: 'hub.challenge', required: true })
  verifyWebhook(
    @Query('hub.mode') mode: string,
    @Query('hub.verify_token') token: string,
    @Query('hub.challenge') challenge: string,
  ): string {
    const config = getWhatsappConfig();
    if (!config?.verifyToken) {
      throw new ServiceUnavailableException('WHATSAPP_VERIFY_TOKEN is not set');
    }
    if (mode === 'subscribe' && token === config.verifyToken) {
      return challenge;
    }
    throw new ServiceUnavailableException('Webhook verification failed');
  }

  @Public()
  @SkipApiWrap()
  @Post('webhook')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Receive WhatsApp events from Meta' })
  receiveWebhook(@Body() body: unknown) {
    return { received: true, body };
  }

  @Post('templates/booking-confirmation')
  @UseGuards(StaffAdminGuard)
  @ApiAccessTokenInSwagger()
  @ApiOperation({
    summary: 'Send vale_executive_template (admin test)',
    description:
      'Sends via FACEBOOK_GRAPH_API. Recipient `to` is always WHATSAPP_TO (owner). Customer fields are template body parameters only.',
  })
  @ApiResponse({ status: 503, description: 'WhatsApp is not configured' })
  sendTemplate(@Body() dto: SendBookingConfirmationDto) {
    if (!this.messaging.isEnabled()) {
      throw new ServiceUnavailableException('WhatsApp is not configured');
    }
    const config = getWhatsappConfig()!;
    const to = resolveOwnerWhatsappTo(
      config.whatsappTo,
      config.defaultCountryCode,
    );
    if (!to) {
      throw new ServiceUnavailableException(
        'WHATSAPP_TO is not set or invalid (required owner notification number)',
      );
    }
    return this.messaging.sendBookingConfirmationTemplate({
      to,
      customerName: dto.customerName,
      contactNumber: dto.contactNumber,
      email: dto.email,
      departureLocation: dto.departureLocation,
      stopoverLocation: dto.stopoverLocation ?? 'None',
      roomNo: dto.roomNo?.trim() || 'None',
      passengers: dto.passengers?.trim() || '1',
      destinationLocation: dto.destinationLocation,
      travelDateLabel: dto.travelDateLabel,
      selectedService: dto.selectedService,
      totalFare: dto.totalFare,
    });
  }

  @Post('bookings/:id/booking-confirmation')
  @UseGuards(StaffAdminGuard)
  @ApiAccessTokenInSwagger()
  @ApiOperation({
    summary: 'Send vale_executive_template for an existing booking (admin)',
    description:
      'WhatsApp `to` is always WHATSAPP_TO (owner). Booking customer contactNumber is stored on the booking only.',
  })
  async sendForBooking(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: TestBookingConfirmationFromBookingDto,
  ) {
    return this.bookingWhatsapp.sendBookingConfirmationById(id, {
      preferredPickupAt: dto.preferredPickupAt
        ? new Date(dto.preferredPickupAt)
        : undefined,
    });
  }
}
