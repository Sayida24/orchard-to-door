"use client";

import { useFormStatus } from "react-dom";
import { ui } from "@/lib/ui";

export function SubmitButton({
  children,
  pendingText = "Saving…",
  className = ui.button,
  disabled,
}: {
  children: React.ReactNode;
  pendingText?: string;
  className?: string;
  disabled?: boolean;
}) {
  const { pending } = useFormStatus();
  return (
    <button type="submit" disabled={pending || disabled} className={className}>
      {pending ? pendingText : children}
    </button>
  );
}
