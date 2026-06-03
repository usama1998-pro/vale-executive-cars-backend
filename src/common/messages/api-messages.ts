/** User-facing API messages (returned to clients in `message` field). */
export const API_MESSAGES = {
  booking: {
    created:
      'Your booking has been submitted successfully. Please check your WhatsApp and email for confirmation.',
    notFound: 'We could not find that booking.',
    refConflict: 'That booking reference is already in use. Please try again.',
    refInvalid:
      'The booking reference must contain numbers only (4–10 digits).',
    refAllocateFailed:
      'We could not create a booking reference. Please try again shortly.',
    listSuccess: 'Bookings loaded successfully.',
    getSuccess: 'Booking loaded successfully.',
    updateSuccess: 'Booking updated successfully.',
    deleteSuccess: 'Booking deleted successfully.',
  },
  auth: {
    signInSuccess: 'Signed in successfully.',
    signUpSuccess: 'Account created successfully.',
    signOutSuccess: 'Signed out successfully.',
    invalidCredentials: 'Invalid email or password.',
    tooManyAttempts:
      'Too many failed sign-in attempts. Please wait before trying again.',
    emailTaken: 'An account with this email already exists.',
    unauthorized: 'Please sign in to continue.',
    forbidden: 'You do not have permission to perform this action.',
  },
  whatsapp: {
    notConfigured: 'WhatsApp is not configured on the server.',
    disabled: 'WhatsApp messaging is turned off.',
    sendFailed: 'We could not send the WhatsApp message. Please try again later.',
  },
  users: {
    listSuccess: 'Users loaded successfully.',
  },
  routing: {
    quoteSuccess: 'Route quote calculated successfully.',
    fareSuccess: 'Fare calculated successfully.',
    geocodeFailed: 'We could not find one of the addresses. Please check and try again.',
    routeFailed: 'We could not calculate a driving route for this journey.',
  },
  logs: {
    disabled:
      'File logging is disabled. Set LOG_FILE_ENABLED=true on the server.',
    fileNotFound: 'That log file could not be found.',
  },
  generic: {
    validation: 'Please check your details and try again.',
    server: 'Something went wrong on our side. Please try again in a moment.',
    notFound: 'The requested resource was not found.',
    throttled: (limit = 200) =>
      `You are sending requests too quickly. Please wait a moment and try again (limit: ${limit} requests per minute).`,
  },
} as const;
