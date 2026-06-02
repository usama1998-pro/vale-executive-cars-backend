import { isAxiosError } from 'axios';

type MetaGraphErrorBody = {
  error?: {
    message?: string;
    type?: string;
    code?: number;
    error_subcode?: number;
    error_user_msg?: string;
    error_user_title?: string;
    error_data?: { details?: string; messaging_product?: string };
    fbtrace_id?: string;
  };
};

/** Human-readable message from Meta Graph API error responses. */
export function formatMetaGraphApiError(error: unknown): string {
  if (isAxiosError(error) && error.response?.data) {
    const body = error.response.data as MetaGraphErrorBody;
    const meta = body.error;
    if (meta?.message) {
      const parts = [
        meta.message,
        meta.error_user_msg ? `hint: ${meta.error_user_msg}` : null,
        meta.error_data?.details ? `details: ${meta.error_data.details}` : null,
        meta.code != null ? `code ${meta.code}` : null,
        meta.error_subcode != null ? `subcode ${meta.error_subcode}` : null,
        meta.type ? meta.type : null,
        meta.fbtrace_id ? `trace ${meta.fbtrace_id}` : null,
      ].filter(Boolean);
      return parts.join(' · ');
    }
    if (error.response.status) {
      return `HTTP ${error.response.status}: ${error.message}`;
    }
  }
  if (error instanceof Error) {
    return error.message;
  }
  return 'WhatsApp send failed';
}
