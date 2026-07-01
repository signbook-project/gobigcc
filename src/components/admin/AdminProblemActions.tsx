"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useToast } from "@/components/ui/Toaster";

export function AdminProblemActions({ problemId, currentStatus, slug }: {
  problemId: string; currentStatus: string; slug: string;
}) {
  const router = useRouter();
  const { success, error } = useToast();
  const [loading, setLoading] = useState(false);

  async function update(status: string) {
    setLoading(true);
    const res = await fetch("/api/admin/problems", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ problemId, status }),
    });
    setLoading(false);
    if (res.ok) { success("Challenge updated"); router.refresh(); }
    else error("Update failed");
  }

  return (
    <div className="flex items-center gap-1.5">
      {currentStatus !== "CLOSED" && (
        <button onClick={() => update("CLOSED")} disabled={loading}
          className="rounded border px-2 py-1 text-xs text-muted-foreground hover:bg-secondary transition-colors">
          Close
        </button>
      )}
      {currentStatus === "CLOSED" && (
        <button onClick={() => update("ACCEPTING_SOLUTIONS")} disabled={loading}
          className="rounded border px-2 py-1 text-xs text-green-700 border-green-200 hover:bg-green-50 transition-colors">
          Reopen
        </button>
      )}
      <Link href={`/problems/${slug}`} target="_blank"
        className="rounded border px-2 py-1 text-xs hover:bg-secondary transition-colors">
        View
      </Link>
    </div>
  );
}
