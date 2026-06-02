import type {
  WhatsappSendTemplateRequest,
  WhatsappTemplateBodyComponent,
} from '../types/whatsapp-api.types';
import { sanitizeTemplateParameter } from '../utils/template-parameter.util';

export type BookingConfirmationTemplateInput = {
  to: string;
  /** {{1}} Hello {{1}}, */
  customerName: string;
  /** {{2}} Thank you for booking with {{2}}. */
  businessName: string;
  /** {{3}} Your appointment for {{3}} … (max 30 chars, utility template) */
  serviceLabel: string;
  pickupDateLabel: string;
  pickupTimeLabel: string;
  templateName: string;
  languageCode: string;
};

export function buildBookingConfirmationBodyComponent(
  input: Omit<
    BookingConfirmationTemplateInput,
    'to' | 'templateName' | 'languageCode'
  >,
): WhatsappTemplateBodyComponent {
  return {
    type: 'body',
    parameters: [
      { type: 'text', text: sanitizeTemplateParameter(input.customerName) },
      { type: 'text', text: sanitizeTemplateParameter(input.businessName) },
      { type: 'text', text: sanitizeTemplateParameter(input.serviceLabel) },
      { type: 'text', text: sanitizeTemplateParameter(input.pickupDateLabel) },
      { type: 'text', text: sanitizeTemplateParameter(input.pickupTimeLabel) },
    ],
  };
}

export function buildBookingConfirmationTemplateRequest(
  input: BookingConfirmationTemplateInput,
): WhatsappSendTemplateRequest {
  return {
    messaging_product: 'whatsapp',
    to: input.to,
    type: 'template',
    template: {
      name: input.templateName,
      language: { code: input.languageCode },
      components: [
        buildBookingConfirmationBodyComponent({
          customerName: input.customerName,
          businessName: input.businessName,
          serviceLabel: input.serviceLabel,
          pickupDateLabel: input.pickupDateLabel,
          pickupTimeLabel: input.pickupTimeLabel,
        }),
      ],
    },
  };
}
