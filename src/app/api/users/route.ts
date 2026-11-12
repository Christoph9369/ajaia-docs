import { NextResponse } from "next/server";
import { getDb } from "@/db";
import { route } from "@/lib/api";
import { requireApiUser } from "@/lib/auth";
import { listUsers } from "@/lib/documents";

/** Directory of accounts, used for share suggestions. */
export const GET = route(async () => {
  await requireApiUser();
  return NextResponse.json({ users: await listUsers(getDb()) });
});
