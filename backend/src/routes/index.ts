import { Router } from "express";
import { authController } from "../controllers/auth.controller";
import { contactController } from "../controllers/contact.controller";
import { conversationController } from "../controllers/conversation.controller";
import { notificationController } from "../controllers/notification.controller";
import { userController } from "../controllers/user.controller";
import { authRateLimit, requireCsrfHeader, verifyAuth } from "../middleware/auth.middleware";
import { validate } from "../middleware/validate.middleware";
import {
  addMembersSchema,
  channelUrlParam,
  contactRequestSchema,
  createDirectSchema,
  createGroupSchema,
  idParam,
  listNotificationsQuery,
  loginSchema,
  presenceQuery,
  registerSchema,
  searchUsersQuery,
  updateMeSchema,
  userIdParam,
} from "../validators";

/* ---------- auth ---------- */
const auth = Router();
auth.post("/register", authRateLimit, validate({ body: registerSchema }), authController.register);
auth.post("/login", authRateLimit, validate({ body: loginSchema }), authController.login);
auth.post("/refresh", requireCsrfHeader, authController.refresh);
auth.post("/logout", requireCsrfHeader, authController.logout);
auth.get("/me", verifyAuth, authController.me);

/* ---------- sendbird ---------- */
const sendbird = Router();
sendbird.get("/session-token", verifyAuth, authController.sendbirdSession);

/* ---------- users ---------- */
const users = Router();
users.use(verifyAuth);
users.get("/search", validate({ query: searchUsersQuery }), userController.search);
users.get("/presence", validate({ query: presenceQuery }), userController.presence);
users.patch("/me", validate({ body: updateMeSchema }), userController.updateMe);
users.get("/:id", validate({ params: idParam }), userController.getProfile);

/* ---------- contacts ---------- */
const contacts = Router();
contacts.use(verifyAuth);
contacts.get("/", contactController.list);
contacts.get("/requests", contactController.listRequests);
contacts.post("/requests", validate({ body: contactRequestSchema }), contactController.sendRequest);
contacts.post("/requests/:id/accept", validate({ params: idParam }), contactController.accept);
contacts.delete("/requests/:id", validate({ params: idParam }), contactController.removeRequest);
contacts.get("/blocked", contactController.listBlocked);
contacts.post("/:userId/block", validate({ params: userIdParam }), contactController.block);
contacts.delete("/:userId/block", validate({ params: userIdParam }), contactController.unblock);
contacts.delete("/:userId", validate({ params: userIdParam }), contactController.removeContact);

/* ---------- conversations ---------- */
const conversations = Router();
conversations.use(verifyAuth);
conversations.post("/direct", validate({ body: createDirectSchema }), conversationController.createDirect);
conversations.post("/groups", validate({ body: createGroupSchema }), conversationController.createGroup);
conversations.post(
  "/:channelUrl/members",
  validate({ params: channelUrlParam, body: addMembersSchema }),
  conversationController.addMembers,
);

/* ---------- notifications ---------- */
const notifications = Router();
notifications.use(verifyAuth);
notifications.get("/", validate({ query: listNotificationsQuery }), notificationController.list);
notifications.get("/unread-count", notificationController.unreadCount);
notifications.post("/read-all", notificationController.markAllRead);
notifications.patch("/:id/read", validate({ params: idParam }), notificationController.markRead);

/* ---------- mount ---------- */
export const apiRouter = Router();
apiRouter.get("/health", (_req, res) => {
  res.json({ data: { status: "ok" } });
});
apiRouter.use("/auth", auth);
apiRouter.use("/sendbird", sendbird);
apiRouter.use("/users", users);
apiRouter.use("/contacts", contacts);
apiRouter.use("/conversations", conversations);
apiRouter.use("/notifications", notifications);
