import { getQuery } from "../middleware/validate.middleware";
import { userService } from "../services/user.service";
import { asyncHandler, requireUserId } from "../utils/http";

export const userController = {
  search: asyncHandler(async (req, res) => {
    const { q } = getQuery<{ q: string }>(req);
    res.json({ data: await userService.search(requireUserId(req), q) });
  }),

  updateMe: asyncHandler(async (req, res) => {
    res.json({ data: await userService.updateMe(requireUserId(req), req.body) });
  }),

  presence: asyncHandler(async (req, res) => {
    const { ids } = getQuery<{ ids: string[] }>(req);
    res.json({ data: await userService.presence(ids) });
  }),

  getProfile: asyncHandler(async (req, res) => {
    res.json({ data: await userService.getProfile(requireUserId(req), req.params.id) });
  }),
};
