// ---------------------------------------------------------------------------
// A typed error the error-handling middleware knows how to serialise.
// Throw `new ApiError(403, 'message')` anywhere; asyncHandler forwards it.
// ---------------------------------------------------------------------------

export class ApiError extends Error {
  /**
   * @param {number} status  HTTP status code
   * @param {string} message Human-readable message (safe to send to the client)
   * @param {unknown} [details] Optional structured details (e.g. Zod issues)
   */
  constructor(status, message, details = undefined) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.details = details;
    this.expose = true; // marks this as a deliberate, client-safe error
    Error.captureStackTrace?.(this, ApiError);
  }
}
