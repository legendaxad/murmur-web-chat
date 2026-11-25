/** HTTP codes and messages, following BURAK's libs/Error.ts convention. */
export enum HttpCode {
  OK = 200,
  CREATED = 201,
  NO_CONTENT = 204,
  BAD_REQUEST = 400,
  UNAUTHORIZED = 401,
  FORBIDDEN = 403,
  NOT_FOUND = 404,
  CONFLICT = 409,
  TOO_MANY_REQUESTS = 429,
  INTERNAL_SERVER_ERROR = 500,
  BAD_GATEWAY = 502,
}

export enum Message {
  SOMETHING_WENT_WRONG = "Something went wrong",
  VALIDATION_FAILED = "Validation failed",
  NOT_AUTHENTICATED = "You are not authenticated. Please log in.",
  SESSION_EXPIRED = "Your session has expired. Please log in again.",
  INVALID_CREDENTIALS = "Invalid username/email or password",
  ACCOUNT_BLOCKED = "This account has been blocked",
  USERNAME_OR_EMAIL_TAKEN = "Username or email is already in use",
  USER_NOT_FOUND = "User not found",
  NOT_FOUND = "Resource not found",
  CANNOT_TARGET_SELF = "You cannot do that to yourself",
  ALREADY_FRIENDS = "You are already contacts",
  REQUEST_ALREADY_SENT = "Contact request already sent",
  REQUEST_NOT_FOUND = "Contact request not found",
  USER_BLOCKED = "This action is not allowed because one of you has blocked the other",
  DM_NOT_ALLOWED = "This user only accepts messages from contacts",
  GROUP_MEMBERS_MUST_BE_CONTACTS = "You can only add your contacts to a group",
  NOT_A_MEMBER = "You are not a member of this conversation",
  NOT_A_GROUP = "This conversation is not a group",
  CHAT_PROVIDER_ERROR = "The chat service is temporarily unavailable",
  TOO_MANY_REQUESTS = "Too many attempts. Please try again later.",
  CSRF_HEADER_MISSING = "Missing required request header",
}

export class AppError extends Error {
  public readonly code: HttpCode;
  public readonly details?: unknown;

  constructor(code: HttpCode, message: Message | string, details?: unknown) {
    super(message);
    this.code = code;
    this.details = details;
  }
}
