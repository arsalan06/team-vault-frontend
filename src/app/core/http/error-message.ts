import { HttpErrorResponse } from '@angular/common/http';

/**
 * Turns a failed request into text that is safe to show a user. The backend's
 * 4xx messages are written for users (AppError), so those are passed through;
 * 5xx and unknown errors get a generic line, since their details are internal.
 */
export function errorMessage(error: unknown, fallback = 'Something went wrong. Please try again.') {
  if (!(error instanceof HttpErrorResponse)) return fallback;
  if (error.status === 0) return 'Cannot reach the server. Check your connection and try again.';
  if (error.status === 429) return 'Too many requests. Please wait a moment and try again.';

  const body: unknown = error.error;
  if (error.status >= 400 && error.status < 500 && isApiError(body)) {
    const details = body.details && Object.values(body.details).flat()[0];
    return details ? `${body.error}: ${details}` : body.error;
  }
  return fallback;
}

interface ApiError {
  error: string;
  details?: Record<string, string[] | undefined>;
}

function isApiError(body: unknown): body is ApiError {
  return typeof body === 'object' && body !== null && typeof (body as ApiError).error === 'string';
}
