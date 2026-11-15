import { createHash, randomBytes } from "node:crypto";
import { prisma } from "@/lib/prisma";

export const SELF_SERVICE_TTL_MS = 30 * 60 * 1000; // email link: 30 minutes
export const ADMIN_LINK_TTL_MS = 24 * 60 * 60 * 1000; // admin-shared link: 24 hours
export const MAX_REQUESTS_PER_HOUR = 3;

const hash = (token: string) => createHash("sha256").update(token).digest("hex");

function appUrl() {
  return (process.env.NEXTAUTH_URL ?? "http://localhost:3000").replace(/\/$/, "");
}

/**
 * Creates a one-time reset link. The raw token only ever exists in the link;
 * the database keeps its hash. Older unused links for the user stop working.
 */
export async function createResetLink(userId: string, ttlMs: number, createdById?: string) {
  const token = randomBytes(32).toString("base64url");
  await prisma.$transaction([
    prisma.passwordResetToken.updateMany({
      where: { userId, usedAt: null },
      data: { usedAt: new Date() },
    }),
    prisma.passwordResetToken.create({
      data: { tokenHash: hash(token), userId, createdById, expiresAt: new Date(Date.now() + ttlMs) },
    }),
  ]);
  return { url: `${appUrl()}/reset-password?token=${token}`, expiresAt: new Date(Date.now() + ttlMs) };
}

/** Self-service requests in the last hour, to stop people flooding a mailbox. */
export async function recentRequestCount(userId: string) {
  return prisma.passwordResetToken.count({
    where: { userId, createdById: null, createdAt: { gt: new Date(Date.now() - 60 * 60 * 1000) } },
  });
}

/** The matching token if it exists, is unused and hasn't expired; otherwise null. */
export async function findValidToken(token: string) {
  if (!token || token.length > 200) return null;
  const row = await prisma.passwordResetToken.findUnique({
    where: { tokenHash: hash(token) },
    include: { user: { select: { id: true, name: true } } },
  });
  if (!row || row.usedAt || row.expiresAt < new Date()) return null;
  return row;
}
