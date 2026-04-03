export class ApiError extends Error {
  public code: string;
  public details?: Record<string, unknown>;
  public requestId?: string;
  public httpStatus?: number;
  public status?: number;

  constructor(
    code: string,
    message: string,
    details?: Record<string, unknown>,
    requestIdOrHttpStatus?: string | number,
    httpStatus?: number,
  ) {
    super(message);
    this.name = 'ApiError';
    this.code = code;
    this.details = details;

    if (typeof requestIdOrHttpStatus === 'number' && httpStatus === undefined) {
      this.httpStatus = requestIdOrHttpStatus;
    } else {
      this.requestId = requestIdOrHttpStatus as string | undefined;
      this.httpStatus = httpStatus;
    }

    this.status = this.httpStatus;
  }

  isValidationError(): boolean {
    return this.code.startsWith('VALIDATION_');
  }

  getFieldErrors(): Record<string, string> | null {
    return (this.details?.fields as Record<string, string>) ?? null;
  }
}