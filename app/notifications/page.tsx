import type { Metadata } from "next";
import { Suspense } from "react";
import { SubmitButton } from "@/components/submit-button";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { dateLabel, timeLabel } from "@/lib/shop";
import { ui } from "@/lib/ui";
import { markAllRead, openNotification } from "./actions";

export const metadata: Metadata = { title: "Notifications · Orchiva" };

// FR-12 / FR-18: on-site notifications for every role (new orders, status changes,
// problem-report decisions, reviews).
export default function NotificationsPage() {
  return (
    <main className="mx-auto w-full max-w-xl px-4 pb-12 pt-6">
      <h1 className="mb-4 text-3xl font-extrabold tracking-tight text-stone-900">Notifications</h1>
      <Suspense fallback={<div className="h-48 animate-pulse rounded-3xl bg-stone-200" aria-label="Loading notifications" />}>
        <NotificationList />
      </Suspense>
    </main>
  );
}

async function NotificationList() {
  const user = await requireUser();
  const notes = await prisma.notification.findMany({
    where: { userId: user.id },
    orderBy: { createdAt: "desc" },
    take: 50,
  });
  const unread = notes.filter((n) => !n.isRead).length;

  if (notes.length === 0) {
    return <p className={`${ui.card} text-stone-600`}>Nothing yet. Updates about your orders will show up here.</p>;
  }

  return (
    <div className="space-y-3">
      {unread > 0 && (
        <form action={markAllRead} className="flex items-center justify-between gap-3">
          <p className="text-sm text-stone-600">{unread} unread</p>
          <SubmitButton pendingText="Saving…" className={ui.buttonSecondary}>
            Mark all as read
          </SubmitButton>
        </form>
      )}
      <ul className="space-y-2">
        {notes.map((n) => (
          <li key={n.id}>
            <form action={openNotification}>
              <input type="hidden" name="id" value={n.id} />
              <button
                type="submit"
                className={`flex w-full items-start gap-3 rounded-2xl border p-4 text-left hover:border-amber-400 ${
                  n.isRead ? "border-stone-200 bg-white" : "border-amber-300 bg-amber-50"
                }`}
              >
                <span
                  aria-hidden="true"
                  className={`mt-1.5 h-2.5 w-2.5 shrink-0 rounded-full ${n.isRead ? "bg-transparent" : "bg-amber-600"}`}
                />
                <span className="min-w-0 flex-1">
                  <span className={`block ${n.isRead ? "text-stone-700" : "font-semibold text-stone-900"}`}>
                    {n.message}
                    {!n.isRead && <span className="sr-only"> (unread)</span>}
                  </span>
                  <span className="block text-xs text-stone-500">
                    {dateLabel(n.createdAt)}, {timeLabel(n.createdAt)}
                  </span>
                </span>
              </button>
            </form>
          </li>
        ))}
      </ul>
    </div>
  );
}
