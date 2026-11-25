import { HttpCode } from "../errors/AppError";
import { getQuery } from "../middleware/validate.middleware";
import { notificationService } from "../services/notification.service";
import { asyncHandler, requireUserId } from "../utils/http";

export const notificationController = {
  list: asyncHandler(async (req, res) => {
    const { limit, before } = getQuery<{ limit: number; before?: string }>(req);
    res.json({ data: await notificationService.list(requireUserId(req), limit, before) });
  }),

  unreadCount: asyncHandler(async (req, res) => {
    res.json({ data: { count: await notificationService.unreadCount(requireUserId(req)) } });
  }),

  markRead: asyncHandler(async (req, res) => {
    await notificationService.markRead(requireUserId(req), req.params.id);
    res.status(HttpCode.NO_CONTENT).end();
  }),

  markAllRead: asyncHandler(async (req, res) => {
    await notificationService.markAllRead(requireUserId(req));
    res.status(HttpCode.NO_CONTENT).end();
  }),
};
