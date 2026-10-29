"use client";

import { useState } from "react";
import {
  acceptRequest,
  networkErrorMessage,
  removeConnection,
  sendRequest,
} from "./api";
import type { Relationship } from "./logic";

const primary =
  "rounded-full bg-primary px-4 py-1.5 text-sm font-medium text-on-primary hover:opacity-90 disabled:opacity-60";
const outline =
  "rounded-full border border-line px-4 py-1.5 text-sm font-medium hover:border-primary disabled:opacity-60";

/** One button (or pair) that moves a relationship forward. Reports the new state to the parent. */
export function ConnectButton({
  me,
  other,
  relationship,
  onChange,
}: {
  me: string;
  other: string;
  relationship: Relationship;
  onChange: () => void;
}) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function run(task: () => Promise<void>) {
    setBusy(true);
    setError(null);
    try {
      await task();
      onChange();
    } catch (err) {
      console.error("Connection change failed", err);
      setError(networkErrorMessage(err));
    } finally {
      setBusy(false);
    }
  }

  let buttons: React.ReactNode;
  switch (relationship.state) {
    case "none":
      buttons = (
        <button
          type="button"
          disabled={busy}
          onClick={() => void run(() => sendRequest(me, other))}
          className={primary}
        >
          Connect
        </button>
      );
      break;
    case "sent":
      buttons = (
        <button
          type="button"
          disabled={busy}
          onClick={() =>
            void run(() => removeConnection(relationship.connectionId))
          }
          className={outline}
        >
          Requested · Cancel
        </button>
      );
      break;
    case "received":
      buttons = (
        <span className="flex gap-2">
          <button
            type="button"
            disabled={busy}
            onClick={() =>
              void run(() => acceptRequest(relationship.connectionId))
            }
            className={primary}
          >
            Accept
          </button>
          <button
            type="button"
            disabled={busy}
            onClick={() =>
              void run(() => removeConnection(relationship.connectionId))
            }
            className={outline}
          >
            Decline
          </button>
        </span>
      );
      break;
    case "connected":
      buttons = (
        <button
          type="button"
          disabled={busy}
          onClick={() => {
            if (window.confirm("Remove this connection?"))
              void run(() => removeConnection(relationship.connectionId));
          }}
          className={outline}
        >
          Connected · Remove
        </button>
      );
      break;
  }

  return (
    <span className="flex flex-col items-end gap-1">
      {buttons}
      {error && (
        <span role="alert" className="text-xs text-red-600">
          {error}
        </span>
      )}
    </span>
  );
}
