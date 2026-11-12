import { eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { getDb } from "@/db";
import { users } from "@/db/schema";
import { parseJson, route } from "@/lib/api";
import { AppError } from "@/lib/errors";
import { encodeSession, SESSION_COOKIE, SESSION_MAX_AGE } from "@/lib/session";
import { loginSchema } from "@/lib/validation";

export const POST = route(async (req) => {
  const { email } = await parseJson(req, loginSchema);
  const user = await getDb().query.users.findFirst({ where: eq(users.email, email) });
  if (!user) throw new AppError("NOT_FOUND", "No demo account with that email.");

  const res = NextResponse.json({ user: { id: user.id, name: user.name, email: user.email } });
  res.cookies.set(SESSION_COOKIE, encodeSession(user.id), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: SESSION_MAX_AGE,
  });
  return res;
});
