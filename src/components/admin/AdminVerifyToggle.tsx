"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useToast } from "@/components/ui/Toaster";
import { BadgeCheck } from "lucide-react";
import { cn } from "@/lib/utils";

export function AdminVerifyToggle({ corporateId, verified }: { corporateId: string; verified: boolean }) {
  const router = useRouter();
  const { success, error } = useToast();
  const [loading, setLoading] = useState(false);

  async function toggle() {
    setLoading(true);
    const res = await fetch("/api/admin/corporates", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ corporateId, verified: !verified }),
    });
    setLoading(false);
    if (res.ok) { success(verified ? "Verification removed" : "Company verified"); router.refresh(); }
    else error("Update failed");
  }

  return (
    <button
      onClick={toggle}
      disabled={loading}
      className={cn(
        "flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs transition-colors",
        verified ? "bg-blue-50 border-blue-200 text-blue-700" : "text-muted-foreground hover:bg-secondary"
      )}
    >
      <BadgeCheck className="h-3 w-3" />
      {verified ? "Verified" : "Verify"}
    </button>
  );
}
