import { Request, RequestHandler } from "express";
import { ZodType } from "zod";

interface Schemas {
  body?: ZodType;
  query?: ZodType;
  params?: ZodType;
}

type WithValidatedQuery = Request & { validatedQuery?: unknown };

/**
 * Validates and normalizes request input. Parsed body/params replace the raw ones,
 * so controllers only see validated data. The parsed query is stored separately
 * (read it with getQuery) because req.query is not assignable in Express 5.
 * Validation errors go to the central error handler.
 */
export const validate =
  (schemas: Schemas): RequestHandler =>
  (req, _res, next) => {
    try {
      if (schemas.body) req.body = schemas.body.parse(req.body);
      if (schemas.params) req.params = schemas.params.parse(req.params) as Request["params"];
      if (schemas.query) (req as WithValidatedQuery).validatedQuery = schemas.query.parse(req.query);
      next();
    } catch (err) {
      next(err);
    }
  };

export const getQuery = <T>(req: Request): T => (req as WithValidatedQuery).validatedQuery as T;
