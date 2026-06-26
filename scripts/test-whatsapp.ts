/**
 * Test WhatsApp booking template without creating a booking.
 *
 * Usage:
 *   npm run test:whatsapp              # send fake sample message
 *   npm run test:whatsapp -- status    # show WhatsApp env config
 *   npm run test:whatsapp -- dry-run   # print Graph API payload only
 *   npm run test:whatsapp -- booking <uuid>  # send from DB booking
 *   npm run test:whatsapp -- api       # send via running API (full stack)
 */
import '../src/bootstrap-env';
import { PrismaMariaDb } from '@prisma/adapter-mariadb';
import { PrismaClient, type Booking } from '@prisma/client';
import { isVehicleType, PRICING } from '../src/common/pricing/pricing';
import { getPrismaMariaDbAdapterConfig } from '../src/core/database/database-url';
import { buildBookingConfirmationTemplateRequest } from '../src/modules/whatsapp/templates/booking-confirmation.template';
import { getWhatsappConfig } from '../src/modules/whatsapp/whatsapp.config';
import { resolveOwnerWhatsappTo } from '../src/modules/whatsapp/utils/phone.util';

type SamplePayload = Omit<
  Parameters<typeof buildBookingConfirmationTemplateRequest>[0],
  'to' | 'templateName' | 'languageCode'
>;

const SAMPLE_BOOKING: SamplePayload = {
  customerName: 'Test Customer',
  contactNumber: '447700900123',
  email: 'test@example.com',
  departureLocation: 'Heathrow Airport Terminal 5',
  stopoverLocation: 'None',
  roomNo: '214',
  passengers: '2',
  destinationLocation: 'Central London',
  pickupDateLabel: '5 June 2026 at 3:30 pm',
  returnDateLabel: '6 June 2026 at 4:00 pm',
  selectedService: 'EXECUTIVE',
  totalFare: '£75.00',
};

function usage(): void {
  console.log(`Usage:
  npm run test:whatsapp              Send fake sample booking message
  npm run test:whatsapp -- status    Show WhatsApp configuration
  npm run test:whatsapp -- dry-run   Print Graph API payload (no send)
  npm run test:whatsapp -- booking <uuid>  Send from existing booking
  npm run test:whatsapp -- api       Send sample via HTTP API (server required)`);
}

function maskSecret(value: string | undefined, visible = 8): string | null {
  if (!value?.trim()) {
    return null;
  }
  const trimmed = value.trim();
  if (trimmed.length <= visible) {
    return '***';
  }
  return `${trimmed.slice(0, visible)}...`;
}

function formatDateTimeLabel(date: Date): string {
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

function formatStopoverLocation(via: string): string {
  const trimmed = via.trim();
  if (!trimmed || trimmed.toLowerCase() === 'car') {
    return 'None';
  }
  return trimmed;
}

function formatRoomNo(roomNo: string | null | undefined): string {
  const trimmed = roomNo?.trim();
  return trimmed ? trimmed : 'None';
}

function formatPassengers(passengers: number | null | undefined): string {
  return String(passengers ?? 1);
}

function formatSelectedService(vehicleType: string): string {
  if (isVehicleType(vehicleType)) {
    return PRICING[vehicleType].label;
  }
  return vehicleType.trim().toUpperCase() || 'EXECUTIVE';
}

function formatTotalFare(estimatedFare: number): string {
  return `£${estimatedFare.toFixed(2)}`;
}

function bookingToPayload(booking: Booking): SamplePayload {
  return {
    customerName: booking.customerName,
    contactNumber: booking.contactNumber,
    email: booking.email,
    departureLocation: booking.pickupFrom,
    stopoverLocation: formatStopoverLocation(booking.via),
    roomNo: formatRoomNo(booking.roomNo),
    passengers: formatPassengers(booking.passengers),
    destinationLocation: booking.dropoffTo,
    pickupDateLabel: formatDateTimeLabel(booking.preferredPickupAt),
    returnDateLabel: booking.returnPickupAt
      ? formatDateTimeLabel(booking.returnPickupAt)
      : 'None',
    selectedService: formatSelectedService(booking.vehicleType),
    totalFare: formatTotalFare(booking.estimatedFare),
  };
}

function requireConfig() {
  const config = getWhatsappConfig();
  if (!config) {
    throw new Error(
      'WhatsApp is not configured. Set WHATSAPP_TOKEN and FACEBOOK_GRAPH_API (or WHATSAPP_PHONE_NUMBER_ID).',
    );
  }
  if (!config.enabled) {
    throw new Error('WhatsApp is disabled (WHATSAPP_ENABLED=false).');
  }
  const to = resolveOwnerWhatsappTo(
    config.whatsappTo,
    config.defaultCountryCode,
  );
  if (!to) {
    throw new Error('WHATSAPP_TO is not set or invalid.');
  }
  return { config, to };
}

function buildPayload(
  fields: SamplePayload,
): ReturnType<typeof buildBookingConfirmationTemplateRequest> {
  const { config, to } = requireConfig();
  return buildBookingConfirmationTemplateRequest({
    to,
    templateName: config.bookingConfirmationTemplate,
    languageCode: config.templateLanguageCode,
    ...fields,
  });
}

async function sendPayload(
  payload: ReturnType<typeof buildBookingConfirmationTemplateRequest>,
): Promise<unknown> {
  const { config } = requireConfig();
  const response = await fetch(config.graphApiUrl, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${config.accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });

  const body = (await response.json().catch(() => ({}))) as Record<
    string,
    unknown
  >;
  if (!response.ok) {
    const detail =
      typeof body.error === 'object' &&
      body.error !== null &&
      'message' in body.error
        ? String((body.error as { message?: string }).message)
        : JSON.stringify(body);
    throw new Error(`Graph API ${response.status}: ${detail}`);
  }
  return body;
}

function printStatus(): void {
  const config = getWhatsappConfig();
  if (!config) {
    console.log('WhatsApp: not configured');
    return;
  }

  const to = resolveOwnerWhatsappTo(
    config.whatsappTo,
    config.defaultCountryCode,
  );

  console.log('WhatsApp status:');
  console.log(`  enabled:              ${config.enabled}`);
  console.log(`  template:             ${config.bookingConfirmationTemplate}`);
  console.log(`  language:             ${config.templateLanguageCode}`);
  console.log(`  graphApiUrl:          ${config.graphApiUrl}`);
  console.log(`  phoneNumberId:        ${config.phoneNumberId ?? '(unknown)'}`);
  console.log(`  whatsappTo (raw):     ${config.whatsappTo ?? '(not set)'}`);
  console.log(`  whatsappTo (resolved):${to ?? '(invalid)'}`);
  console.log(`  token:                ${maskSecret(config.accessToken)}`);
}

async function sendViaApi(fields: SamplePayload): Promise<void> {
  const baseUrl = (process.env.APP_URL ?? 'http://localhost:3001').replace(
    /\/$/,
    '',
  );
  const email = process.env.ADMIN_EMAIL?.trim().toLowerCase();
  const password = process.env.ADMIN_PASSWORD?.trim();
  if (!email || !password) {
    throw new Error('Set ADMIN_EMAIL and ADMIN_PASSWORD for API mode.');
  }

  const signInRes = await fetch(`${baseUrl}/auth/signin`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });
  const signInBody = (await signInRes.json()) as {
    data?: { access_token?: string };
    access_token?: string;
    message?: string;
  };
  if (!signInRes.ok) {
    throw new Error(
      `Sign-in failed (${signInRes.status}): ${signInBody.message ?? 'unknown error'}`,
    );
  }

  const token =
    signInBody.data?.access_token ?? signInBody.access_token ?? undefined;
  if (!token) {
    throw new Error('Sign-in succeeded but no access_token was returned.');
  }

  const sendRes = await fetch(
    `${baseUrl}/whatsapp/templates/booking-confirmation`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(fields),
    },
  );
  const sendBody = await sendRes.json();
  if (!sendRes.ok) {
    throw new Error(
      `API send failed (${sendRes.status}): ${JSON.stringify(sendBody)}`,
    );
  }

  console.log('API response:');
  console.log(JSON.stringify(sendBody, null, 2));
}

async function loadBookingPayload(bookingId: string): Promise<SamplePayload> {
  const adapter = new PrismaMariaDb(getPrismaMariaDbAdapterConfig());
  const prisma = new PrismaClient({ adapter });
  try {
    const booking = await prisma.booking.findUnique({
      where: { id: bookingId },
    });
    if (!booking) {
      throw new Error(`Booking not found: ${bookingId}`);
    }
    return bookingToPayload(booking);
  } finally {
    await prisma.$disconnect();
  }
}

async function main(): Promise<void> {
  const [command, arg] = process.argv.slice(2);
  const cmd = command ?? 'send';

  try {
    switch (cmd) {
      case 'help':
      case '--help':
      case '-h':
        usage();
        return;

      case 'status':
        printStatus();
        return;

      case 'dry-run': {
        const payload = buildPayload(SAMPLE_BOOKING);
        console.log(JSON.stringify(payload, null, 2));
        return;
      }

      case 'booking': {
        if (!arg) {
          throw new Error('booking requires a booking UUID.');
        }
        const fields = await loadBookingPayload(arg);
        const payload = buildPayload(fields);
        console.log(
          `Sending booking WhatsApp for ${arg} → ${payload.to} (template=${payload.template.name})`,
        );
        const result = await sendPayload(payload);
        console.log('Sent successfully:');
        console.log(JSON.stringify(result, null, 2));
        return;
      }

      case 'api': {
        console.log(`Sending sample booking via API (${process.env.APP_URL ?? 'http://localhost:3001'})...`);
        await sendViaApi(SAMPLE_BOOKING);
        return;
      }

      case 'send':
      default: {
        if (cmd !== 'send' && command !== undefined) {
          usage();
          process.exitCode = 1;
          return;
        }
        const payload = buildPayload(SAMPLE_BOOKING);
        console.log(
          `Sending sample booking WhatsApp → ${payload.to} (template=${payload.template.name})`,
        );
        const result = await sendPayload(payload);
        console.log('Sent successfully:');
        console.log(JSON.stringify(result, null, 2));
        return;
      }
    }
  } catch (error) {
    console.error(error instanceof Error ? error.message : error);
    process.exitCode = 1;
  }
}

void main();
