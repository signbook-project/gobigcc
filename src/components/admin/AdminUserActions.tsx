"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useToast } from "@/components/ui/Toaster";

export function AdminUserActions({ userId, currentStatus, currentRole }: {
  userId: string; currentStatus: string; currentRole: string;
}) {
  const router = useRouter();
  const { success, error } = useToast();
  const [loading, setLoading] = useState(false);

  async function update(patch: Record<string, string>) {
    setLoading(true);
    const res = await fetch("/api/admin/users", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId, ...patch }),
    });
    setLoading(false);
    if (res.ok) { success("User updated"); router.refresh(); }
    else error("Update failed");
  }

  return (
    <div className="flex gap-1.5">
      {currentStatus === "ACTIVE" ? (
        <button onClick={() => update({ status: "SUSPENDED" })} disabled={loading}
          className="rounded border px-2 py-1 text-xs text-amber-700 border-amber-200 hover:bg-amber-50 transition-colors">
          Suspend
        </button>
      ) : (
        <button onClick={() => update({ status: "ACTIVE" })} disabled={loading}
          className="rounded border px-2 py-1 text-xs text-green-700 border-green-200 hover:bg-green-50 transition-colors">
          Activate
        </button>
      )}
      {currentStatus !== "BANNED" && (
        <button onClick={() => update({ status: "BANNED" })} disabled={loading}
          className="rounded border px-2 py-1 text-xs text-red-700 border-red-200 hover:bg-red-50 transition-colors">
          Ban
        </button>
      )}
    </div>
  );
}
