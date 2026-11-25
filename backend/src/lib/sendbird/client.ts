import axios, { AxiosError } from "axios";
import { env } from "../../config/env";
import { AppError, HttpCode, Message } from "../../errors/AppError";

/**
 * The ONLY place the Sendbird master API token is used.
 * Never return this client's config or raw errors to callers: axios errors
 * contain request headers, including the token.
 */
export const sendbirdHttp = axios.create({
  baseURL: `https://api-${env.SENDBIRD_APP_ID}.sendbird.com/v3`,
  timeout: 10_000,
  headers: { "Api-Token": env.SENDBIRD_API_TOKEN, "Content-Type": "application/json; charset=utf8" },
});

export interface SendbirdApiErrorBody {
  code?: number;
  message?: string;
  error?: boolean;
}

/** Sendbird error codes we handle explicitly. */
export const SendbirdErrorCode = {
  USER_ALREADY_EXISTS: 400202,
  RESOURCE_NOT_FOUND: 400201,
} as const;

export class SendbirdApiError extends AppError {
  constructor(public readonly sendbirdCode: number | undefined, public readonly httpStatus: number | undefined) {
    super(HttpCode.BAD_GATEWAY, Message.CHAT_PROVIDER_ERROR);
  }
}

/** Runs a Platform API call and turns failures into a safe SendbirdApiError. */
export async function sendbirdCall<T>(label: string, fn: () => Promise<{ data: T }>): Promise<T> {
  try {
    const res = await fn();
    return res.data;
  } catch (err) {
    const axErr = err as AxiosError<SendbirdApiErrorBody>;
    const body = axErr.response?.data;
    // Log only Sendbird's error body: never axErr.config, which holds the token.
    console.error(`[sendbird] ${label} failed`, { status: axErr.response?.status, code: body?.code, message: body?.message ?? axErr.message });
    throw new SendbirdApiError(body?.code, axErr.response?.status);
  }
}
