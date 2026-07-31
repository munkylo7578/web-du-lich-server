import "server-only";

import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import { ADMIN_PATH, AUTH_SESSION_COOKIE, LOGIN_PATH } from "@/lib/auth/constants";

const SESSION_DURATION_IN_SECONDS = 60 * 60 * 8;
const SESSION_SUBJECT = "single-admin";

type SessionPayload = {
  sub: string;
  username: string;
};

export type AuthSession = {
  userId: string;
  username: string;
};

function getSessionSecret() {
  const secret = process.env.AUTH_SESSION_SECRET;

  if (!secret || secret.length < 32) {
    throw new Error(
      "AUTH_SESSION_SECRET must be set in .env and contain at least 32 characters.",
    );
  }

  return new TextEncoder().encode(secret);
}

function getConfiguredCredentials() {
  const username = process.env.AUTH_LOGIN_USERNAME;
  const password = process.env.AUTH_LOGIN_PASSWORD;

  if (!username || !password) {
    throw new Error(
      "AUTH_LOGIN_USERNAME and AUTH_LOGIN_PASSWORD must be set in .env before logging in.",
    );
  }

  return { username, password };
}

async function signSessionToken(payload: SessionPayload) {
  return new SignJWT({ username: payload.username })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(payload.sub)
    .setIssuedAt()
    .setExpirationTime(`${SESSION_DURATION_IN_SECONDS}s`)
    .sign(getSessionSecret());
}

export async function authenticateCredentials(username: string, password: string) {
  const configured = getConfiguredCredentials();

  return username === configured.username && password === configured.password;
}

export async function createSession() {
  const { username } = getConfiguredCredentials();
  const token = await signSessionToken({
    sub: SESSION_SUBJECT,
    username,
  });

  const expiresAt = new Date(Date.now() + SESSION_DURATION_IN_SECONDS * 1000);
  const cookieStore = await cookies();

  cookieStore.set(AUTH_SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    expires: expiresAt,
  });

  return { expiresAt };
}

export async function clearSession() {
  const cookieStore = await cookies();
  cookieStore.delete(AUTH_SESSION_COOKIE);
}

export async function getSession(): Promise<AuthSession | null> {
  const token = (await cookies()).get(AUTH_SESSION_COOKIE)?.value;

  if (!token) {
    return null;
  }

  try {
    const { payload } = await jwtVerify(token, getSessionSecret(), {
      algorithms: ["HS256"],
    });

    if (payload.sub !== SESSION_SUBJECT || typeof payload.username !== "string") {
      return null;
    }

    return {
      userId: payload.sub,
      username: payload.username,
    };
  } catch {
    return null;
  }
}

export async function requireSession() {
  const session = await getSession();

  if (!session) {
    redirect(LOGIN_PATH);
  }

  return session;
}

export async function redirectIfAuthenticated() {
  const session = await getSession();

  if (session) {
    redirect(ADMIN_PATH);
  }
}
