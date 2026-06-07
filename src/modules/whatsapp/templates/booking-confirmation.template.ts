import type {
  WhatsappSendTemplateRequest,
  WhatsappTemplateBodyComponent,
} from '../types/whatsapp-api.types';
import {
  CUSTOM_TEMPLATE_TEXT_MAX_LENGTH,
  sanitizeTemplateParameter,
} from '../utils/template-parameter.util';

/**
 * Meta template: custom_vale_booking
 *
 * A new customer inquiry has been received.
 *
 * Customer Information:
 * • Name: {{1}}
 * • Phone Number: {{2}}
 * • Email Address: {{3}}
 *
 * Journey Information:
 * • Departure Location: {{4}}
 * • Stopover Location: {{5}}
 * • Destination Location: {{6}}
 * • Travel Date: {{7}}
 */
export type BookingConfirmationTemplateInput = {
  to: string;
  customerName: string;
  contactNumber: string;
  email: string;
  departureLocation: string;
  stopoverLocation: string;
  destinationLocation: string;
  travelDateLabel: string;
  templateName: string;
  languageCode: string;
};

export function buildBookingConfirmationBodyComponent(
  input: Omit<
    BookingConfirmationTemplateInput,
    'to' | 'templateName' | 'languageCode'
  >,
): WhatsappTemplateBodyComponent {
  const maxLength = CUSTOM_TEMPLATE_TEXT_MAX_LENGTH;
  return {
    type: 'body',
    parameters: [
      {
        type: 'text',
        text: sanitizeTemplateParameter(input.customerName, maxLength),
      },
      {
        type: 'text',
        text: sanitizeTemplateParameter(input.contactNumber, maxLength),
      },
      {
        type: 'text',
        text: sanitizeTemplateParameter(input.email, maxLength),
      },
      {
        type: 'text',
        text: sanitizeTemplateParameter(input.departureLocation, maxLength),
      },
      {
        type: 'text',
        text: sanitizeTemplateParameter(input.stopoverLocation, maxLength),
      },
      {
        type: 'text',
        text: sanitizeTemplateParameter(input.destinationLocation, maxLength),
      },
      {
        type: 'text',
        text: sanitizeTemplateParameter(input.travelDateLabel, maxLength),
      },
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
          contactNumber: input.contactNumber,
          email: input.email,
          departureLocation: input.departureLocation,
          stopoverLocation: input.stopoverLocation,
          destinationLocation: input.destinationLocation,
          travelDateLabel: input.travelDateLabel,
        }),
      ],
    },
  };
}
