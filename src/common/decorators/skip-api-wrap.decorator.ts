import { SetMetadata } from '@nestjs/common';

export const SKIP_API_WRAP_KEY = 'skipApiWrap';

/** Return the handler result as-is (no `{ success, message, data }` envelope). */
export const SkipApiWrap = () => SetMetadata(SKIP_API_WRAP_KEY, true);
