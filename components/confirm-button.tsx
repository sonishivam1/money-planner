"use client";

import { useState, useTransition } from "react";

/** A destructive button that asks for a second tap instead of a browser dialog. */
export function ConfirmButton({ label, onConfirm }: { label: string; onConfirm: () => Promise<void> }) {
  const [armed, setArmed] = useState(false);
  const [pending, start] = useTransition();
  return (
    <button
      type="button"
      className="btn btn-sm btn-danger"
      disabled={pending}
      onClick={() => {
        if (!armed) {
          setArmed(true);
          setTimeout(() => setArmed(false), 3000);
          return;
        }
        start(() => onConfirm());
      }}
    >
      {pending ? "Removing…" : armed ? "Tap again" : label}
    </button>
  );
}
