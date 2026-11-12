import { NextResponse } from "next/server";
import { ZodError, type ZodType } from "zod";
import { AppError } from "./errors";

export interface ApiErrorBody {
  error: { code: string; message: string; details?: unknown };
}

/** Wraps a route handler so every failure returns a consistent JSON error shape. */
export function route<Ctx>(handler: (req: Request, ctx: Ctx) => Promise<Response>) {
  return async (req: Request, ctx: Ctx): Promise<Response> => {
    try {
      return await handler(req, ctx);
    } catch (err) {
      if (err instanceof AppError) {
        return NextResponse.json<ApiErrorBody>(
          { error: { code: err.code, message: err.message, details: err.details } },
          { status: err.status },
        );
      }
      if (err instanceof ZodError) {
        return NextResponse.json<ApiErrorBody>(
          { error: { code: "VALIDATION", message: err.issues[0]?.message ?? "Invalid request." } },
          { status: 400 },
        );
      }
      console.error("Unhandled API error", err);
      return NextResponse.json<ApiErrorBody>(
        { error: { code: "INTERNAL", message: "Something went wrong. Please try again." } },
        { status: 500 },
      );
    }
  };
}

export async function parseJson<T>(req: Request, schema: ZodType<T>): Promise<T> {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    throw new AppError("VALIDATION", "Request body must be valid JSON.");
  }
  return schema.parse(body);
}
