export const ScrapingRequestErrorCode = {
  Http: "HTTP_ERROR",
  Network: "NETWORK_ERROR",
  Timeout: "TIMEOUT",
} as const;

type RequestErrorCode =
  (typeof ScrapingRequestErrorCode)[keyof typeof ScrapingRequestErrorCode];

export class ScrapingRequestError extends Error {
  readonly code: RequestErrorCode;
  readonly status: number | undefined;

  constructor(
    code: RequestErrorCode,
    message: string,
    options: { status?: number; cause?: unknown } = {},
  ) {
    super(message, { cause: options.cause });
    this.name = "ScrapingRequestError";
    this.code = code;
    this.status = options.status;
  }
}
