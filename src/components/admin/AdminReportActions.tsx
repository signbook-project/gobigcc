"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useToast } from "@/components/ui/Toaster";

export function AdminReportActions({ reportId, currentStatus }: { reportId: string; currentStatus: string }) {
  const router = useRouter();
  const { success, error } = useToast();
  const [loading, setLoading] = useState(false);

  async function update(status: string) {
    setLoading(true);
    const res = await fetch("/api/admin/reports", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ reportId, status }),
    });
    setLoading(false);
    if (res.ok) { success("Report updated"); router.refresh(); }
    else error("Failed to update");
  }

  if (currentStatus !== "PENDING") return (
    <span className="text-xs text-muted-foreground">{currentStatus}</span>
  );

  return (
    <div className="flex gap-1.5">
      <button onClick={() => update("RESOLVED")} disabled={loading}
        className="rounded border px-2 py-1 text-xs text-green-700 border-green-200 hover:bg-green-50">
        Resolve
      </button>
      <button onClick={() => update("DISMISSED")} disabled={loading}
        className="rounded border px-2 py-1 text-xs text-muted-foreground hover:bg-secondary">
        Dismiss
      </button>
    </div>
  );
}
