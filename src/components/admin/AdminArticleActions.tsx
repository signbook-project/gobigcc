"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useToast } from "@/components/ui/Toaster";

export function AdminArticleActions({ articleId, currentStatus, slug }: {
  articleId: string; currentStatus: string; slug: string;
}) {
  const router = useRouter();
  const { success, error } = useToast();
  const [loading, setLoading] = useState(false);

  async function update(status: string) {
    setLoading(true);
    const res = await fetch(`/api/admin/editorial/${articleId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
    setLoading(false);
    if (res.ok) { success(`Article ${status.toLowerCase()}`); router.refresh(); }
    else error("Update failed");
  }

  return (
    <div className="flex items-center gap-1.5">
      <Link href={`/admin/editorial/${articleId}`}
        className="rounded border px-2 py-1 text-xs hover:bg-secondary transition-colors">
        Edit
      </Link>
      {currentStatus === "DRAFT" && (
        <button onClick={() => update("PUBLISHED")} disabled={loading}
          className="rounded border px-2 py-1 text-xs text-green-700 border-green-200 hover:bg-green-50 transition-colors">
          Publish
        </button>
      )}
      {currentStatus === "PUBLISHED" && (
        <button onClick={() => update("DRAFT")} disabled={loading}
          className="rounded border px-2 py-1 text-xs text-amber-700 border-amber-200 hover:bg-amber-50 transition-colors">
          Unpublish
        </button>
      )}
      {currentStatus !== "ARCHIVED" && (
        <button onClick={() => update("ARCHIVED")} disabled={loading}
          className="rounded border px-2 py-1 text-xs text-muted-foreground hover:bg-secondary transition-colors">
          Archive
        </button>
      )}
      <Link href={`/editorial/${slug}`} target="_blank"
        className="rounded border px-2 py-1 text-xs text-muted-foreground hover:bg-secondary transition-colors">
        ↗
      </Link>
    </div>
  );
}
