"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useToast } from "@/components/ui/Toaster";

export function AdminJobActions({ jobId, currentStatus, slug }: {
  jobId: string; currentStatus: string; slug: string;
}) {
  const router = useRouter();
  const { success, error } = useToast();
  const [loading, setLoading] = useState(false);

  async function update(status: string, rejectionReason?: string) {
    setLoading(true);
    const res = await fetch("/api/admin/jobs", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ jobId, status, rejectionReason }),
    });
    setLoading(false);
    if (res.ok) { success("Job updated"); router.refresh(); }
    else error("Update failed");
  }

  function handleReject() {
    const reason = window.prompt("Reason for rejecting this job posting (optional):");
    if (reason === null) return; // cancelled
    update("REJECTED", reason || undefined);
  }

  if (currentStatus === "PENDING_REVIEW") {
    return (
      <div className="flex items-center gap-1.5">
        <button onClick={() => update("ACTIVE")} disabled={loading}
          className="rounded border px-2 py-1 text-xs text-green-700 border-green-200 hover:bg-green-50 transition-colors font-medium">
          Approve
        </button>
        <button onClick={handleReject} disabled={loading}
          className="rounded border px-2 py-1 text-xs text-red-700 border-red-200 hover:bg-red-50 transition-colors">
          Reject
        </button>
        <Link href={`/jobs/${slug}`} target="_blank"
          className="rounded border px-2 py-1 text-xs hover:bg-secondary transition-colors">
          Preview
        </Link>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-1.5">
      {currentStatus === "ACTIVE" && (
        <button onClick={() => update("PAUSED")} disabled={loading}
          className="rounded border px-2 py-1 text-xs text-amber-700 border-amber-200 hover:bg-amber-50 transition-colors">
          Pause
        </button>
      )}
      {currentStatus === "PAUSED" && (
        <button onClick={() => update("ACTIVE")} disabled={loading}
          className="rounded border px-2 py-1 text-xs text-green-700 border-green-200 hover:bg-green-50 transition-colors">
          Activate
        </button>
      )}
      {currentStatus === "REJECTED" && (
        <button onClick={() => update("PENDING_REVIEW")} disabled={loading}
          className="rounded border px-2 py-1 text-xs text-muted-foreground hover:bg-secondary transition-colors">
          Re-review
        </button>
      )}
      {currentStatus !== "CLOSED" && currentStatus !== "REJECTED" && (
        <button onClick={() => update("CLOSED")} disabled={loading}
          className="rounded border px-2 py-1 text-xs text-muted-foreground hover:bg-secondary transition-colors">
          Close
        </button>
      )}
      {currentStatus === "ACTIVE" && (
        <Link href={`/jobs/${slug}`} target="_blank"
          className="rounded border px-2 py-1 text-xs hover:bg-secondary transition-colors">
          View
        </Link>
      )}
    </div>
  );
}
