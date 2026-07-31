import { redirect } from "next/navigation";

import { ADMIN_PATH, LOGIN_PATH } from "@/lib/auth/constants";
import { getSession } from "@/lib/auth/session";

export default async function HomePage() {
  const session = await getSession();

  redirect(session ? ADMIN_PATH : LOGIN_PATH);
}
