import { NextFunction, Request, RequestHandler, Response } from "express";
import { AppError, HttpCode, Message } from "../errors/AppError";

/** Forwards rejected promises to the central error middleware (no try/catch per controller). */
export const asyncHandler =
  (fn: (req: Request, res: Response, next: NextFunction) => Promise<unknown>): RequestHandler =>
  (req, res, next) => {
    fn(req, res, next).catch(next);
  };

/** Returns the authenticated user id or throws 401. Use only behind verifyAuth. */
export const requireUserId = (req: Request): string => {
  const id = req.auth?.userId;
  if (!id) throw new AppError(HttpCode.UNAUTHORIZED, Message.NOT_AUTHENTICATED);
  return id;
};

export const escapeRegex = (value: string): string => value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
