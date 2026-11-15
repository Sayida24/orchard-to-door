"use client";

import { useActionState, useState } from "react";
import { COMPLAINT_REASONS } from "@/lib/shop";
import { cancelMyOrder, confirmDelivery, reportProblem, submitReview, type FeedbackState } from "./actions";

const field =
  "w-full rounded-[14px] border border-[#DCD4C3] bg-white px-3.5 text-base text-ink placeholder:text-muted focus:border-leaf focus:outline-none focus:ring-2 focus:ring-leaf/20";
const secondary =
  "min-h-11 rounded-2xl border border-line bg-white px-4 text-sm font-semibold text-ink hover:border-[#CFC7B5] hover:bg-cream";

function ErrorNote({ text }: { text?: string }) {
  return text ? (
    <p role="alert" className="rounded-2xl bg-red-50 px-3 py-2 text-sm font-semibold text-red-800">
      {text}
    </p>
  ) : null;
}

// Before the seller approves, the customer can cancel. Asks once more before cancelling.
export function CancelMyOrder({ orderId }: { orderId: string }) {
  const [sure, setSure] = useState(false);
  const [state, action, pending] = useActionState<FeedbackState, FormData>(cancelMyOrder, undefined);

  if (!sure) {
    return (
      <button type="button" onClick={() => setSure(true)} className={secondary}>
        Cancel my order
      </button>
    );
  }
  return (
    <form action={action} className="space-y-2">
      <input type="hidden" name="orderId" value={orderId} />
      <p className="text-sm font-semibold text-ink">Cancel this order? The seller will be told.</p>
      <ErrorNote text={state?.error} />
      <div className="flex flex-wrap gap-2">
        <button type="submit" disabled={pending} className="min-h-11 rounded-2xl bg-red-700 px-4 text-sm font-bold text-white hover:bg-red-600 disabled:opacity-60">
          {pending ? "Cancelling…" : "Yes, cancel it"}
        </button>
        <button type="button" onClick={() => setSure(false)} className={secondary}>
          Keep my order
        </button>
      </div>
    </form>
  );
}

// Shown while the order is on its way: the customer confirms it arrived (FR-19).
export function ConfirmDelivery({ orderId, total }: { orderId: string; total: string }) {
  const [state, action, pending] = useActionState<FeedbackState, FormData>(confirmDelivery, undefined);
  return (
    <form action={action} className="space-y-2.5 rounded-3xl border-2 border-leaf bg-leaf-soft p-5">
      <input type="hidden" name="orderId" value={orderId} />
      <p className="font-display text-[21px] font-semibold text-ink">Got your mangoes?</p>
      <p className="text-sm text-[#22342A]">Pay {total} in cash when the box arrives, then let the seller know.</p>
      <ErrorNote text={state?.error} />
      <button type="submit" disabled={pending} className="min-h-12 w-full rounded-2xl bg-leaf font-bold text-white hover:bg-leaf-dark disabled:opacity-60">
        {pending ? "Saving…" : "I got my mangoes"}
      </button>
    </form>
  );
}

// Report a problem (FR-21). Collapsed until the customer asks for it.
export function ReportForm({ orderId }: { orderId: string }) {
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState("");
  const [message, setMessage] = useState("");
  const [state, action, pending] = useActionState<FeedbackState, FormData>(reportProblem, undefined);

  if (state?.ok) {
    return (
      <p role="status" className="rounded-2xl bg-leaf-soft px-4 py-3 text-sm font-semibold text-leaf">
        Thanks, we&apos;ve got your report. An admin will look at it and decide on a refund or replacement.
      </p>
    );
  }

  if (!open) {
    return (
      <button type="button" onClick={() => setOpen(true)} className={`${secondary} flex w-full items-center justify-center`}>
        Report a problem
      </button>
    );
  }

  return (
    <form action={action} className="space-y-3 rounded-3xl border border-line bg-white p-5">
      <input type="hidden" name="orderId" value={orderId} />
      <h3 className="font-display text-[21px] font-semibold text-ink">Report a problem</h3>
      <fieldset className="space-y-2">
        <legend className="mb-1 text-sm font-semibold text-ink">What went wrong?</legend>
        <div className="grid grid-cols-2 gap-2">
          {COMPLAINT_REASONS.map((r) => (
            <label
              key={r}
              className={`flex min-h-11 cursor-pointer items-center gap-2 rounded-2xl px-3 text-sm font-semibold text-ink has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-leaf ${
                r === reason ? "border-2 border-leaf bg-[#F2F7F0]" : "border border-line hover:border-[#CFC7B5]"
              }`}
            >
              <input type="radio" name="reason" value={r} checked={r === reason} onChange={() => setReason(r)} required className="h-4 w-4 accent-[#1F4D2B]" />
              {r}
            </label>
          ))}
        </div>
      </fieldset>
      <div className="space-y-1.5">
        <label htmlFor="message" className="text-sm font-semibold text-ink">
          Tell us what happened
        </label>
        <textarea
          id="message"
          name="message"
          rows={4}
          required
          minLength={10}
          maxLength={1000}
          placeholder="e.g. Two mangoes had soft, bruised spots when the box arrived."
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          className={`${field} py-3`}
        />
      </div>
      <ErrorNote text={state?.error} />
      <div className="flex gap-2">
        <button type="submit" disabled={pending} className="min-h-12 flex-1 rounded-2xl bg-leaf font-bold text-white hover:bg-leaf-dark disabled:opacity-60">
          {pending ? "Sending…" : "Send report"}
        </button>
        <button type="button" onClick={() => setOpen(false)} className={`${secondary} min-h-12`}>
          Cancel
        </button>
      </div>
    </form>
  );
}

// Rate a delivered order (FR-37): 1–5 stars and an optional comment.
export function ReviewForm({ orderId }: { orderId: string }) {
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState("");
  const [state, action, pending] = useActionState<FeedbackState, FormData>(submitReview, undefined);

  if (state?.ok) {
    return (
      <p role="status" className="rounded-2xl bg-leaf-soft px-4 py-3 text-sm font-semibold text-leaf">
        Thanks for your review!
      </p>
    );
  }

  return (
    <form action={action} className="space-y-3">
      <input type="hidden" name="orderId" value={orderId} />
      <fieldset>
        <legend className="mb-2 text-sm font-semibold text-ink">How were your mangoes?</legend>
        <div className="flex gap-1">
          {[1, 2, 3, 4, 5].map((n) => (
            <label key={n} className="cursor-pointer">
              <input type="radio" name="rating" value={n} checked={rating === n} onChange={() => setRating(n)} required className="peer sr-only" />
              <span className="flex h-11 w-11 items-center justify-center rounded-xl peer-focus-visible:ring-2 peer-focus-visible:ring-leaf">
                <svg aria-hidden="true" className={`h-8 w-8 ${n <= rating ? "text-[#E0890B]" : "text-[#D6CEBC]"}`} viewBox="0 0 24 24" fill="currentColor">
                  <path d="M11.48 3.5a.56.56 0 0 1 1.04 0l2.13 5.11a.56.56 0 0 0 .47.35l5.52.44c.5.04.7.66.32.99l-4.2 3.6a.56.56 0 0 0-.18.56l1.28 5.39a.56.56 0 0 1-.84.61l-4.72-2.88a.56.56 0 0 0-.59 0l-4.73 2.88a.56.56 0 0 1-.84-.61l1.29-5.39a.56.56 0 0 0-.18-.56l-4.2-3.6a.56.56 0 0 1 .32-.99l5.52-.44a.56.56 0 0 0 .47-.35Z" />
                </svg>
              </span>
              <span className="sr-only">
                {n} {n === 1 ? "star" : "stars"}
              </span>
            </label>
          ))}
        </div>
      </fieldset>
      <div className="space-y-1.5">
        <label htmlFor="comment" className="text-sm font-semibold text-ink">
          Comment <span className="font-normal text-muted">(optional)</span>
        </label>
        <textarea
          id="comment"
          name="comment"
          rows={3}
          maxLength={500}
          placeholder="Taste, ripeness, packing…"
          value={comment}
          onChange={(e) => setComment(e.target.value)}
          className={`${field} py-3`}
        />
      </div>
      <ErrorNote text={state?.error} />
      <button type="submit" disabled={pending || rating === 0} className="min-h-12 w-full rounded-2xl bg-mango font-bold text-ink hover:bg-mango-dark disabled:opacity-60">
        {pending ? "Sending…" : "Post review"}
      </button>
    </form>
  );
}
