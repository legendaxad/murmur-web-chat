import { HttpCode } from "../errors/AppError";
import { conversationService } from "../services/conversation.service";
import { asyncHandler, requireUserId } from "../utils/http";

export const conversationController = {
  createDirect: asyncHandler(async (req, res) => {
    res.status(HttpCode.CREATED).json({ data: await conversationService.createDirect(requireUserId(req), req.body.userId) });
  }),

  createGroup: asyncHandler(async (req, res) => {
    const { name, memberIds, coverUrl } = req.body;
    res
      .status(HttpCode.CREATED)
      .json({ data: await conversationService.createGroup(requireUserId(req), name, memberIds, coverUrl) });
  }),

  addMembers: asyncHandler(async (req, res) => {
    await conversationService.addMembers(requireUserId(req), req.params.channelUrl, req.body.userIds);
    res.status(HttpCode.NO_CONTENT).end();
  }),
};
