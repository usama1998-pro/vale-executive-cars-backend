import type {
  WhatsappSendTemplateRequest,
  WhatsappTemplateBodyComponent,
} from '../types/whatsapp-api.types';
import {
  CUSTOM_TEMPLATE_TEXT_MAX_LENGTH,
  sanitizeTemplateParameter,
} from '../utils/template-parameter.util';

/**
 * Meta template: vale_booking_message
 *
 * A new customer booking has been received.
 *
 * Customer Information:
 * • Name: {{1}}
 * • Phone Number: {{2}}
 * • Email Address: {{3}}
 * • Room No. : {{4}}
 * • Passengers: {{5}}
 *
 * Journey Information:
 * • Departure Location: {{6}}
 * • Destination Location: {{7}}
 * • Pickup Date  & Time: {{8}}
 * • Return Date & Time: {{9}}
 *
 * Selected Service:
 * {{10}}
 *
 * Total Fare: {{11}}
 *
 * Note:
 * {{12}}
 *
 * Please review the details and contact the customer if required
 */
export type BookingConfirmationTemplateInput = {
  to: string;
  customerName: string;
  contactNumber: string;
  email: string;
  roomNo: string;
  passengers: string;
  departureLocation: string;
  destinationLocation: string;
  pickupDateLabel: string;
  returnDateLabel: string;
  selectedService: string;
  totalFare: string;
  note: string;
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
        text: sanitizeTemplateParameter(input.roomNo, maxLength),
      },
      {
        type: 'text',
        text: sanitizeTemplateParameter(input.passengers, maxLength),
      },
      {
        type: 'text',
        text: sanitizeTemplateParameter(input.departureLocation, maxLength),
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
      {
        type: 'text',
        text: sanitizeTemplateParameter(input.note, maxLength),
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
          roomNo: input.roomNo,
          passengers: input.passengers,
          departureLocation: input.departureLocation,
          destinationLocation: input.destinationLocation,
          pickupDateLabel: input.pickupDateLabel,
          returnDateLabel: input.returnDateLabel,
          selectedService: input.selectedService,
          totalFare: input.totalFare,
          note: input.note,
        }),
      ],
    },
  };
}
