import Link from "next/link";
import { Heart, GitFork, Eye, Download } from "lucide-react";
import { cn, formatNumber } from "@/lib/utils";
import type { DesignCard as DesignCardType } from "@/types";
import { Badge } from "@/components/ui/Card";

const LICENSE_COLORS: Record<string, any> = {
  OPEN_SOURCE: "success",
  ROYALTY_BASED: "info",
  COLLABORATION_ONLY: "warning",
  CUSTOM: "secondary",
};

const LICENSE_LABELS: Record<string, string> = {
  OPEN_SOURCE: "Open source",
  ROYALTY_BASED: "Royalty",
  COLLABORATION_ONLY: "Collab",
  CUSTOM: "Custom",
};

interface Props {
  design: DesignCardType;
  className?: string;
}

export function DesignCard({ design, className }: Props) {
  const thumb = design.files.find((f) =>
    ["image/jpeg", "image/png", "image/webp"].includes(f.fileType)
  );
  const authorName =
    design.identityType === "ALIAS" && design.publishedAlias
      ? design.publishedAlias
      : design.author.name ?? "Designer";

  return (
    <Link
      href={`/designs/${design.slug}`}
      className={cn("group flex flex-col overflow-hidden rounded-lg border bg-card hover:shadow-md transition-shadow", className)}
    >
      {/* Thumbnail */}
      <div className="relative aspect-[4/3] overflow-hidden bg-muted">
        {thumb ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={thumb.fileUrl}
            alt={design.title}
            className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-muted-foreground text-xs">
            No preview
          </div>
        )}
        <div className="absolute top-2 right-2">
          <Badge variant={LICENSE_COLORS[design.licenseType] ?? "secondary"}>
            {LICENSE_LABELS[design.licenseType] ?? design.licenseType}
          </Badge>
        </div>
      </div>

      {/* Meta */}
      <div className="flex flex-col gap-1.5 p-3">
        <p className="font-medium text-sm leading-tight line-clamp-1">{design.title}</p>
        <p className="text-xs text-muted-foreground">by {authorName}</p>

        {/* Stats row */}
        <div className="flex items-center gap-3 text-xs text-muted-foreground mt-1">
          <span className="flex items-center gap-1">
            <Heart className="h-3 w-3" />
            {formatNumber(design._count.likes)}
          </span>
          <span className="flex items-center gap-1">
            <GitFork className="h-3 w-3" />
            {formatNumber(design._count.forks ?? 0)}
          </span>
          <span className="flex items-center gap-1 ml-auto">
            <Eye className="h-3 w-3" />
            {formatNumber(design.viewCount)}
          </span>
        </div>
      </div>
    </Link>
  );
}

// ─── Skeleton ─────────────────────────────────────────────────────────────
export function DesignCardSkeleton() {
  return (
    <div className="flex flex-col overflow-hidden rounded-lg border bg-card animate-pulse">
      <div className="aspect-[4/3] bg-muted" />
      <div className="p-3 space-y-2">
        <div className="h-4 w-3/4 bg-muted rounded" />
        <div className="h-3 w-1/2 bg-muted rounded" />
        <div className="h-3 w-1/3 bg-muted rounded" />
      </div>
    </div>
  );
}
