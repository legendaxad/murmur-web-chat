import { NextFunction, Request, Response } from "express";
import rateLimit from "express-rate-limit";
import { AppError, HttpCode, Message } from "../errors/AppError";
import { tokenService } from "../services/token.service";

/** Reads `Authorization: Bearer <jwt>`. */
const extractBearer = (req: Request): string | undefined => {
  const header = req.headers.authorization;
  if (typeof header !== "string") return undefined;
  const match = /^Bearer\s+(\S+)\s*$/i.exec(header);
  return match?.[1];
};

/** Requires a valid access token (same role as BURAK's memberController.verifyAuth). */
export const verifyAuth = (req: Request, _res: Response, next: NextFunction) => {
  const token = extractBearer(req);
  if (!token) return next(new AppError(HttpCode.UNAUTHORIZED, Message.NOT_AUTHENTICATED));
  try {
    req.auth = { userId: tokenService.verifyAccessToken(token).sub };
    next();
  } catch (err) {
    next(err);
  }
};

/** Attaches the user if a valid token is present, but never rejects (BURAK's retrieveAuth). */
export const retrieveAuth = (req: Request, _res: Response, next: NextFunction) => {
  const token = extractBearer(req);
  if (token) {
    try {
      req.auth = { userId: tokenService.verifyAccessToken(token).sub };
    } catch {
      /* treat as anonymous */
    }
  }
  next();
};

/**
 * Endpoints that rely on the refresh cookie require a custom header. Browsers
 * can't add custom headers cross-site without a CORS preflight, and our CORS
 * allowlist rejects that preflight, so this blocks CSRF.
 */
export const requireCsrfHeader = (req: Request, _res: Response, next: NextFunction) => {
  if (req.get("X-Requested-With") !== "fetch") {
    return next(new AppError(HttpCode.FORBIDDEN, Message.CSRF_HEADER_MISSING));
  }
  next();
};

const limitHandler = (_req: Request, _res: Response, next: NextFunction) =>
  next(new AppError(HttpCode.TOO_MANY_REQUESTS, Message.TOO_MANY_REQUESTS));

/** Slows down password guessing on login/register. */
export const authRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 20,
  standardHeaders: "draft-8",
  legacyHeaders: false,
  handler: limitHandler,
});

export const apiRateLimit = rateLimit({
  windowMs: 60 * 1000,
  limit: 300,
  standardHeaders: "draft-8",
  legacyHeaders: false,
  handler: limitHandler,
});
