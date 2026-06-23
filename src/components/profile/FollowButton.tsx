"use client";

import { useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useToast } from "@/components/ui/Toaster";
import { cn } from "@/lib/utils";

export function FollowButton({ targetUserId, initialFollowing }: {
  targetUserId: string;
  initialFollowing: boolean;
}) {
  const { data: session } = useSession();
  const router = useRouter();
  const { success } = useToast();
  const [following, setFollowing] = useState(initialFollowing);
  const [loading, setLoading] = useState(false);

  async function toggle() {
    if (!session) { router.push("/login"); return; }
    setLoading(true);
    const res = await fetch("/api/profile/follow", {
      method: following ? "DELETE" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ targetUserId }),
    });
    setLoading(false);
    if (res.ok) {
      setFollowing(v => !v);
      success(following ? "Unfollowed" : "Following!");
    }
  }

  return (
    <button
      onClick={toggle}
      disabled={loading}
      className={cn(
        "rounded-md px-4 py-2 text-sm font-medium transition-colors border",
        following
          ? "bg-secondary text-foreground hover:bg-destructive/10 hover:text-destructive hover:border-destructive/30"
          : "bg-primary text-primary-foreground hover:bg-primary/90 border-primary"
      )}
    >
      {loading ? "…" : following ? "Following" : "Follow"}
    </button>
  );
}
