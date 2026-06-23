"use client";

import { useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { Heart, Bookmark, GitFork, Share2, Users, Flag } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { useToast } from "@/components/ui/Toaster";
import { cn, formatNumber } from "@/lib/utils";

interface Props {
  designId: string;
  designSlug: string;
  authorId: string;
  initialLiked: boolean;
  initialSaved: boolean;
  initialLikes: number;
  licenseType: string;
  collab: boolean;
}

export function DesignActions({
  designId, designSlug, authorId,
  initialLiked, initialSaved, initialLikes,
  licenseType, collab,
}: Props) {
  const { data: session } = useSession();
  const router = useRouter();
  const { success, error, info } = useToast();
  const [liked, setLiked] = useState(initialLiked);
  const [saved, setSaved] = useState(initialSaved);
  const [likes, setLikes] = useState(initialLikes);
  const [forking, setForking] = useState(false);

  async function toggleLike() {
    if (!session) { router.push("/login"); return; }
    setLiked(v => !v);
    setLikes(v => v + (liked ? -1 : 1));
    await fetch(`/api/designs/${designId}/like`, { method: liked ? "DELETE" : "POST" });
  }

  async function toggleSave() {
    if (!session) { router.push("/login"); return; }
    setSaved(v => !v);
    const res = await fetch(`/api/designs/${designId}/save`, { method: saved ? "DELETE" : "POST" });
    if (res.ok) success(saved ? "Removed from saved" : "Saved to your profile");
  }

  async function handleFork() {
    if (!session) { router.push("/login"); return; }
    setForking(true);
    const res = await fetch(`/api/designs/${designId}/fork`, { method: "POST" });
    setForking(false);
    if (res.ok) {
      const d = await res.json();
      success("Design forked!", "Find it in your profile to edit.");
      router.push(`/designs/${d.slug}`);
    } else {
      const d = await res.json();
      error(d.error ?? "Fork failed");
    }
  }

  async function handleShare() {
    const url = `${window.location.origin}/designs/${designSlug}`;
    try {
      await navigator.clipboard.writeText(url);
      success("Link copied to clipboard");
    } catch {
      info("Share this link", url);
    }
  }

  async function handleReport() {
    if (!session) { router.push("/login"); return; }
    const res = await fetch("/api/reports", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ targetType: "DESIGN", reportedDesignId: designId, reportType: "OTHER" }),
    });
    if (res.ok) success("Report submitted", "Our team will review it.");
    else error("Failed to submit report");
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      <button
        onClick={toggleLike}
        className={cn(
          "flex items-center gap-2 rounded-md border px-3 py-1.5 text-sm transition-colors",
          liked ? "border-red-200 bg-red-50 text-red-600" : "hover:bg-secondary text-muted-foreground"
        )}
      >
        <Heart className={cn("h-4 w-4", liked && "fill-red-500 text-red-500")} />
        {formatNumber(likes)}
      </button>

      <button
        onClick={toggleSave}
        className={cn(
          "flex items-center gap-2 rounded-md border px-3 py-1.5 text-sm transition-colors",
          saved ? "border-blue-200 bg-blue-50 text-blue-600" : "hover:bg-secondary text-muted-foreground"
        )}
      >
        <Bookmark className={cn("h-4 w-4", saved && "fill-blue-500 text-blue-500")} />
        {saved ? "Saved" : "Save"}
      </button>

      {licenseType !== "ROYALTY_BASED" && (
        <Button variant="outline" size="sm" onClick={handleFork} loading={forking} className="gap-2">
          <GitFork className="h-4 w-4" /> Fork
        </Button>
      )}

      <button
        onClick={handleShare}
        className="flex items-center gap-2 rounded-md border px-3 py-1.5 text-sm hover:bg-secondary text-muted-foreground"
      >
        <Share2 className="h-4 w-4" /> Share
      </button>

      {collab && (
        <Button variant="outline" size="sm" className="gap-2">
          <Users className="h-4 w-4" /> Request collaboration
        </Button>
      )}

      {licenseType === "ROYALTY_BASED" && (
        <Button size="sm" className="gap-2 ml-auto">
          License this design
        </Button>
      )}

      <button
        onClick={handleReport}
        className="flex items-center gap-1.5 rounded-md px-2 py-1.5 text-xs text-muted-foreground hover:text-destructive hover:bg-secondary ml-auto"
      >
        <Flag className="h-3.5 w-3.5" /> Report
      </button>
    </div>
  );
}
