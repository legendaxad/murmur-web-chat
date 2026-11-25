import "express";

declare global {
  namespace Express {
    interface Request {
      /** Set by verifyAuth / retrieveAuth after the access token has been verified. */
      auth?: { userId: string };
    }
  }
}

export {};
