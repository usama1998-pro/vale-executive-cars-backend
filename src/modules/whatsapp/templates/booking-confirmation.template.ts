import type {
  WhatsappSendTemplateRequest,
  WhatsappTemplateBodyComponent,
} from '../types/whatsapp-api.types';
import {
  CUSTOM_TEMPLATE_TEXT_MAX_LENGTH,
  sanitizeTemplateParameter,
} from '../utils/template-parameter.util';

/**
 * Meta template: vale_executive_booking
 *
 * A new customer booking has been received.
 *
 * Customer Information:
 * • Name: {{1}}
 * • Phone Number: {{2}}
 * • Email Address: {{3}}
 *
 * Journey Information:
 * • Departure Location: {{4}}
 * • Stopover Location: {{5}}
 * • Room No. : {{6}}
 * • Passengers: {{7}}
 * • Destination Location: {{8}}
 * • Pickup Date  & Time: {{9}}
 * • Return Date & Time: {{10}}
 *
 * Selected Service:
 * {{11}}
 *
 * Total Fare: {{12}}
 */
export type BookingConfirmationTemplateInput = {
  to: string;
  customerName: string;
  contactNumber: string;
  email: string;
  departureLocation: string;
  stopoverLocation: string;
  roomNo: string;
  passengers: string;
  destinationLocation: string;
  pickupDateLabel: string;
  returnDateLabel: string;
  selectedService: string;
  totalFare: string;
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
        text: sanitizeTemplateParameter(input.roomNo, maxLength),
      },
      {
        type: 'text',
        text: sanitizeTemplateParameter(input.passengers, maxLength),
      },
      {
        type: 'text',
        text: sanitizeTemplateParameter(input.destinationLocation, maxLength),
      },
      {
        type: 'text',
        text: sanitizeTemplateParameter(input.pickupDateLabel, maxLength),
      },
      {
        type: 'text',
        text: sanitizeTemplateParameter(input.returnDateLabel, maxLength),
      },
      {
        type: 'text',
        text: sanitizeTemplateParameter(input.selectedService, maxLength),
      },
      {
        type: 'text',
        text: sanitizeTemplateParameter(input.totalFare, maxLength),
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
          roomNo: input.roomNo,
          passengers: input.passengers,
          destinationLocation: input.destinationLocation,
          pickupDateLabel: input.pickupDateLabel,
          returnDateLabel: input.returnDateLabel,
          selectedService: input.selectedService,
          totalFare: input.totalFare,
        }),
      ],
    },
  };
}
