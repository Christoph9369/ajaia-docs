import "server-only";
import { eq } from "drizzle-orm";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { getDb } from "@/db";
import { users, type User } from "@/db/schema";
import { AppError } from "./errors";
import { decodeSession, SESSION_COOKIE } from "./session";

export async function getCurrentUser(): Promise<User | null> {
  const store = await cookies();
  const userId = decodeSession(store.get(SESSION_COOKIE)?.value);
  if (!userId) return null;
  return (await getDb().query.users.findFirst({ where: eq(users.id, userId) })) ?? null;
}

/** For server components: send signed-out visitors to the login page. */
export async function requirePageUser(): Promise<User> {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  return user;
}

/** For API routes: 401 instead of a redirect. */
export async function requireApiUser(): Promise<User> {
  const user = await getCurrentUser();
  if (!user) throw new AppError("UNAUTHENTICATED", "Please sign in.");
  return user;
}
