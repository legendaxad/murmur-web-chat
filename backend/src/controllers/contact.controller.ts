import { HttpCode } from "../errors/AppError";
import { contactService } from "../services/contact.service";
import { asyncHandler, requireUserId } from "../utils/http";

export const contactController = {
  list: asyncHandler(async (req, res) => {
    res.json({ data: await contactService.listContacts(requireUserId(req)) });
  }),

  listRequests: asyncHandler(async (req, res) => {
    res.json({ data: await contactService.listRequests(requireUserId(req)) });
  }),

  sendRequest: asyncHandler(async (req, res) => {
    const result = await contactService.sendRequest(requireUserId(req), req.body.userId);
    res.status(result.status === "pending" ? HttpCode.CREATED : HttpCode.OK).json({ data: result });
  }),

  accept: asyncHandler(async (req, res) => {
    await contactService.accept(requireUserId(req), req.params.id);
    res.status(HttpCode.NO_CONTENT).end();
  }),

  removeRequest: asyncHandler(async (req, res) => {
    await contactService.removeRequest(requireUserId(req), req.params.id);
    res.status(HttpCode.NO_CONTENT).end();
  }),

  removeContact: asyncHandler(async (req, res) => {
    await contactService.removeContact(requireUserId(req), req.params.userId);
    res.status(HttpCode.NO_CONTENT).end();
  }),

  listBlocked: asyncHandler(async (req, res) => {
    res.json({ data: await contactService.listBlocked(requireUserId(req)) });
  }),

  block: asyncHandler(async (req, res) => {
    await contactService.block(requireUserId(req), req.params.userId);
    res.status(HttpCode.NO_CONTENT).end();
  }),

  unblock: asyncHandler(async (req, res) => {
    await contactService.unblock(requireUserId(req), req.params.userId);
    res.status(HttpCode.NO_CONTENT).end();
  }),
};
