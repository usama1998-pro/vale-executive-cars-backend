import { SetMetadata } from '@nestjs/common';

export const API_SUCCESS_MESSAGE_KEY = 'apiSuccessMessage';

/** Sets the user-facing `message` on successful JSON responses. */
export const ApiSuccessMessage = (message: string) =>
  SetMetadata(API_SUCCESS_MESSAGE_KEY, message);
