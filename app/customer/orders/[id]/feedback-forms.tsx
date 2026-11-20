"use client";

/* eslint-disable @next/next/no-img-element -- photo previews are local blob: URLs */
import { useActionState, useState } from "react";
import { shrinkPhoto } from "@/components/photo-picker";
import { COMPLAINT_REASONS, MAX_REPORT_PHOTOS } from "@/lib/shop";
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

type ReportPhoto = { blob: Blob; preview: string };

// Up to two photos of the problem. They're shrunk in the browser first, so only small
// JPEGs are uploaded; the file input has no name, so the big originals never are.
function ReportPhotoPicker({ photos, onChange }: { photos: ReportPhoto[]; onChange: (p: ReportPhoto[]) => void }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const left = MAX_REPORT_PHOTOS - photos.length;

  async function add(files: FileList | null) {
    const picked = [...(files ?? [])].slice(0, left);
    if (picked.length === 0) return;
    setBusy(true);
    setError("");
    const added: ReportPhoto[] = [];
    for (const file of picked) {
      if (!file.type.startsWith("image/")) {
        setError("That isn't a photo. Choose a JPG or PNG.");
        continue;
      }
      try {
        const blob = await shrinkPhoto(file, 1280);
        added.push({ blob, preview: URL.createObjectURL(blob) });
      } catch {
        setError("A photo couldn't be read. Try a JPG or PNG.");
      }
    }
    onChange([...photos, ...added]);
    setBusy(false);
  }

  function remove(i: number) {
    URL.revokeObjectURL(photos[i].preview);
    onChange(photos.filter((_, k) => k !== i));
  }

  return (
    <div className="space-y-2">
      <p className="text-sm font-semibold text-ink">
        Photos <span className="font-normal text-muted">(optional, up to {MAX_REPORT_PHOTOS})</span>
      </p>
      <div className="flex flex-wrap gap-2">
        {photos.map((p, i) => (
          <div key={p.preview} className="relative">
            <img src={p.preview} alt={`Photo ${i + 1} of the problem`} className="h-24 w-24 rounded-2xl border border-line object-cover" />
            <button
              type="button"
              onClick={() => remove(i)}
              aria-label={`Remove photo ${i + 1}`}
              className="absolute -right-2 -top-2 flex h-8 w-8 items-center justify-center rounded-full border border-line bg-white text-lg font-bold text-ink shadow-sm hover:bg-cream"
            >
              ×
            </button>
          </div>
        ))}
        {left > 0 && (
          <label className="flex h-24 w-24 cursor-pointer flex-col items-center justify-center gap-1 rounded-2xl border-2 border-dashed border-[#CFC7B5] text-center text-xs font-semibold text-muted hover:border-leaf hover:text-leaf has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-leaf">
            <svg aria-hidden="true" viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M3 8a2 2 0 0 1 2-2h2l2-2h6l2 2h2a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2Z" />
              <circle cx="12" cy="13" r="3.5" />
            </svg>
            {busy ? "Adding…" : "Add photo"}
            <input
              type="file"
              accept="image/*"
              multiple={left > 1}
              disabled={busy}
              onChange={(e) => {
                void add(e.target.files);
                e.target.value = "";
              }}
              className="sr-only"
            />
          </label>
        )}
      </div>
      {error && (
        <p role="alert" className="text-xs font-semibold text-red-700">
          {error}
        </p>
      )}
    </div>
  );
}

// Report a problem (FR-21). Collapsed until the customer asks for it.
export function ReportForm({ orderId }: { orderId: string }) {
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState("");
  const [message, setMessage] = useState("");
  // Kept here, so the photos survive React resetting the form after an error.
  const [photos, setPhotos] = useState<ReportPhoto[]>([]);
  const [state, formAction, pending] = useActionState<FeedbackState, FormData>(reportProblem, undefined);

  function action(fd: FormData) {
    photos.forEach((p, i) => fd.append("photo", p.blob, `photo-${i + 1}.jpg`));
    return formAction(fd);
  }

  if (state?.ok) {
    return (
      <p role="status" className="rounded-2xl bg-leaf-soft px-4 py-3 text-sm font-semibold text-leaf">
        Thanks, we&apos;ve sent your report to the seller. They&apos;ll decide on a refund or a new box, and you&apos;ll get a
        notification.
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
      <ReportPhotoPicker photos={photos} onChange={setPhotos} />
      <ErrorNote text={state?.error} />
      <div className="flex gap-2">
        <button type="submit" disabled={pending} className="min-h-12 flex-1 rounded-2xl bg-leaf font-bold text-white hover:bg-leaf-dark disabled:opacity-60">
          {pending ? (photos.length ? "Sending photos…" : "Sending…") : "Send report"}
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
