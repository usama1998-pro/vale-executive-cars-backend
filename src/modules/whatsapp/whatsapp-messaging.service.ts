import { Injectable, Logger } from '@nestjs/common';
import { getWhatsappConfig } from './whatsapp.config';
import {
  buildBookingConfirmationTemplateRequest,
  type BookingConfirmationTemplateInput,
} from './templates/booking-confirmation.template';
import { WhatsappApiClient } from './whatsapp-api.client';

export type WhatsappSendResult = {
  sent: boolean;
  messageId?: string;
  waId?: string;
  skippedReason?: string;
};

@Injectable()
export class WhatsappMessagingService {
  private readonly logger = new Logger(WhatsappMessagingService.name);

  constructor(private readonly api: WhatsappApiClient) {}

  isEnabled(): boolean {
    return this.api.isConfigured();
  }

  async sendBookingConfirmationTemplate(
    input: Omit<
      BookingConfirmationTemplateInput,
      'templateName' | 'languageCode' | 'businessName'
    > & { businessName?: string },
  ): Promise<WhatsappSendResult> {
    const config = getWhatsappConfig();
    if (!config?.enabled) {
      return {
        sent: false,
        skippedReason: 'WhatsApp not configured or disabled',
      };
    }

    const payload = buildBookingConfirmationTemplateRequest({
      ...input,
      businessName: input.businessName ?? config.businessName,
      templateName: config.bookingConfirmationTemplate,
      languageCode: config.templateLanguageCode,
    });

    try {
      const response = await this.api.sendTemplate(payload);
      const messageId = response.messages?.[0]?.id;
      const waId = response.contacts?.[0]?.wa_id;
      this.logger.log(
        `Booking confirmation WhatsApp sent to ${input.to} (message ${messageId ?? 'n/a'})`,
      );
      return { sent: true, messageId, waId };
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'WhatsApp send failed';
      this.logger.warn(`Booking confirmation WhatsApp failed: ${message}`);
      return { sent: false, skippedReason: message };
    }
  }
}
