import { ErrorRequestHandler, RequestHandler } from "express";
import mongoose from "mongoose";
import { ZodError } from "zod";
import { AppError, HttpCode, Message } from "../errors/AppError";
import { env } from "../config/env";

export const notFoundHandler: RequestHandler = (_req, _res, next) => {
  next(new AppError(HttpCode.NOT_FOUND, Message.NOT_FOUND));
};

/**
 * Central error handler. Every error response has the same shape:
 *   { error: { code, message, details? } }
 * Unknown errors never send internals (stack, driver messages) to the client.
 */
export const errorHandler: ErrorRequestHandler = (err, req, res, _next) => {
  let status = HttpCode.INTERNAL_SERVER_ERROR;
  let message: string = Message.SOMETHING_WENT_WRONG;
  let details: unknown;

  if (err instanceof AppError) {
    status = err.code;
    message = err.message;
    details = err.details;
  } else if (err instanceof ZodError) {
    status = HttpCode.BAD_REQUEST;
    message = Message.VALIDATION_FAILED;
    details = err.issues.map((i) => ({ path: i.path.join("."), message: i.message }));
  } else if (err instanceof mongoose.Error.CastError) {
    status = HttpCode.BAD_REQUEST;
    message = Message.VALIDATION_FAILED;
    details = [{ path: err.path, message: "Invalid value" }];
  } else if ((err as { code?: number })?.code === 11000) {
    status = HttpCode.CONFLICT;
    message = Message.USERNAME_OR_EMAIL_TAKEN;
  } else if ((err as { type?: string })?.type === "entity.parse.failed") {
    status = HttpCode.BAD_REQUEST;
    message = "Malformed JSON body";
  }

  if (status >= 500) {
    console.error(`[error] ${req.method} ${req.originalUrl}`, env.isProduction ? (err as Error)?.message : err);
  }

  res.status(status).json({ error: { code: status, message, ...(details ? { details } : {}) } });
};
