import { CookieOptions, Request, Response } from "express";
import { env } from "../config/env";
import { AppError, HttpCode, Message } from "../errors/AppError";
import { authService, AuthResult } from "../services/auth.service";
import { toMe } from "../services/dto";
import { userService } from "../services/user.service";
import { asyncHandler, requireUserId } from "../utils/http";

export const REFRESH_COOKIE = "sb_rt";

const refreshCookieOptions = (expires?: Date): CookieOptions => ({
  httpOnly: true, // JavaScript can't read it, so an XSS bug can't steal it
  secure: env.isProduction,
  sameSite: "lax",
  path: "/api/auth", // only sent to the auth endpoints
  ...(expires ? { expires } : {}),
});

const userAgent = (req: Request) => req.get("user-agent") ?? "";

const sendSession = (res: Response, result: AuthResult, status: HttpCode) => {
  res.cookie(REFRESH_COOKIE, result.refresh.raw, refreshCookieOptions(result.refresh.expiresAt));
  res.status(status).json({ data: { user: toMe(result.user), accessToken: result.accessToken } });
};

export const authController = {
  register: asyncHandler(async (req, res) => {
    sendSession(res, await authService.register(req.body, userAgent(req)), HttpCode.CREATED);
  }),

  login: asyncHandler(async (req, res) => {
    sendSession(res, await authService.login(req.body, userAgent(req)), HttpCode.OK);
  }),

  /** Called when the page loads and whenever the access token expires. */
  refresh: asyncHandler(async (req, res) => {
    const raw = req.cookies?.[REFRESH_COOKIE];
    if (typeof raw !== "string" || !raw) throw new AppError(HttpCode.UNAUTHORIZED, Message.NOT_AUTHENTICATED);
    try {
      sendSession(res, await authService.refresh(raw, userAgent(req)), HttpCode.OK);
    } catch (err) {
      res.clearCookie(REFRESH_COOKIE, refreshCookieOptions());
      throw err;
    }
  }),

  logout: asyncHandler(async (req, res) => {
    await authService.logout(req.cookies?.[REFRESH_COOKIE]);
    res.clearCookie(REFRESH_COOKIE, refreshCookieOptions());
    res.status(HttpCode.NO_CONTENT).end();
  }),

  me: asyncHandler(async (req, res) => {
    res.json({ data: await userService.getMe(requireUserId(req)) });
  }),

  sendbirdSession: asyncHandler(async (req, res) => {
    res.set("Cache-Control", "no-store");
    res.json({ data: await authService.createSendbirdSession(requireUserId(req)) });
  }),
};
