import type { NextAuthOptions } from "next-auth";
import { getServerSession } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { cache } from "react";
import { redirect } from "next/navigation";
import { connection } from "next/server";
import type { Role } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { normalizePhone } from "@/lib/validation";

export const authOptions: NextAuthOptions = {
  session: { strategy: "jwt", maxAge: 30 * 24 * 60 * 60 }, // 30 days
  pages: { signIn: "/login" },
  providers: [
    CredentialsProvider({
      name: "Phone or email",
      credentials: {
        identifier: { label: "Phone or email", type: "text" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        const identifier = credentials?.identifier?.trim();
        const password = credentials?.password;
        if (!identifier || !password) return null;

        const user = await prisma.user.findUnique({
          where: identifier.includes("@")
            ? { email: identifier.toLowerCase() }
            : { phone: normalizePhone(identifier) },
        });
        if (!user || !(await bcrypt.compare(password, user.passwordHash))) return null;

        return { id: user.id, name: user.name, email: user.email, role: user.role };
      },
    }),
  ],
  callbacks: {
    jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.role = user.role;
        token.loginAt = Date.now(); // compared with passwordChangedAt in getCurrentUser
      }
      return token;
    },
    session({ session, token }) {
      session.user.id = token.id;
      session.user.role = token.role;
      session.user.loginAt = token.loginAt ?? 0;
      return session;
    },
  },
};

/**
 * The logged-in user, read fresh from the database (so role changes apply
 * immediately). Returns null when logged out. Deduplicated per request.
 * Reads cookies, so callers must render inside <Suspense>.
 */
export const getCurrentUser = cache(async () => {
  // next-auth makes a random CSRF token before touching cookies; tell Next this
  // is request-time work so it doesn't try to prerender it.
  await connection();
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return null;
  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { id: true, name: true, phone: true, email: true, role: true, passwordChangedAt: true },
  });
  if (!user) return null;
  // A session from before the latest password change no longer counts (e.g. after a reset).
  if (user.passwordChangedAt && session.user.loginAt < user.passwordChangedAt.getTime()) return null;
  return { id: user.id, name: user.name, phone: user.phone, email: user.email, role: user.role };
});

export type CurrentUser = NonNullable<Awaited<ReturnType<typeof getCurrentUser>>>;

/** Use in pages and server actions: redirects if logged out or the role isn't allowed. */
export async function requireUser(roles?: Role[]): Promise<CurrentUser> {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (roles && !roles.includes(user.role)) redirect("/");
  return user;
}
