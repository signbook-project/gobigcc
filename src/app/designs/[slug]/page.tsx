import { DesignActions } from "@/components/design/DesignActions";
import { Navbar } from "@/components/layout/Navbar";
import { CommentSection } from "@/components/shared/CommentSection";
import { Badge } from "@/components/ui/Card";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { formatBytes, formatNumber, timeAgo } from "@/lib/utils";
import { ChevronLeft, Download, GitFork, Heart, Users } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";

const LICENSE_LABELS: Record<string, string> = {
  OPEN_SOURCE: "Open Source", ROYALTY_BASED: "Royalty Based",
  COLLABORATION_ONLY: "Collaboration Only", CUSTOM: "Custom",
};
const LICENSE_VARIANTS: Record<string, any> = {
  OPEN_SOURCE: "success", ROYALTY_BASED: "info",
  COLLABORATION_ONLY: "warning", CUSTOM: "secondary",
};

export default async function DesignDetailPage({ params }: { params: { slug: string } }) {
  const session = await auth();

  const designLookup = await prisma.design.findUnique({
    where: { slug: params.slug },
    select: { id: true, visibility: true, authorId: true, parentDesignId: true },
  });
  if (!designLookup) notFound();

  const isOwner = session?.user?.id === designLookup.authorId;
  if (designLookup.visibility === "DRAFT" && !isOwner) notFound();

  const design = await prisma.design.findUnique({
    where: { slug: params.slug },
    include: {
      author: { include: { designerProfile: true } },
      files: { orderBy: { sortOrder: "asc" } },
      versions: { orderBy: { versionNum: "desc" }, take: 10 },
      collaborators: { include: { user: { include: { designerProfile: true } } } },
      _count: { select: { likes: true, saves: true, comments: true, forkRecords: true } },
    },
  });
  if (!design) notFound();

  // Increment view count (fire-and-forget)
  prisma.design.update({ where: { id: design.id }, data: { viewCount: { increment: 1 } } }).catch(() => {});

  // Check if user liked/saved
  let userLiked = false;
  let userSaved = false;
  if (session?.user) {
    const [like, save] = await Promise.all([
      prisma.designLike.findFirst({ where: { designId: design.id, userId: session.user.id } }),
      prisma.designSave.findFirst({ where: { designId: design.id, userId: session.user.id } }),
    ]);
    userLiked = !!like;
    userSaved = !!save;
  }

  const comments = await prisma.comment.findMany({
    where: { designId: design.id, parentId: null },
    include: {
      author: { include: { designerProfile: true } },
      replies: { include: { author: { include: { designerProfile: true } } } },
    },
    orderBy: { createdAt: "desc" },
    take: 20,
  });

  const authorName = design.identityType === "ALIAS" && design.publishedAlias
    ? design.publishedAlias
    : design.author.name ?? "Designer";

  const imageFiles = design.files.filter(f => f.fileType.startsWith("image/"));
  const downloadFiles = design.files.filter(f => !f.fileType.startsWith("image/"));

  return (
    <>
      <Navbar />
      <div className="mx-auto max-w-5xl px-4 py-8">
        <Link href="/designs" className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground mb-6">
          <ChevronLeft className="h-4 w-4" /> Back to designs
        </Link>

        {design.visibility === "DRAFT" && isOwner && (
          <div className="mb-6 flex items-center justify-between gap-3 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3">
            <div>
              <p className="text-sm font-medium text-amber-800">This design is a draft — only you can see it.</p>
              <p className="text-xs text-amber-700 mt-0.5">
                {design.parentDesignId ? "Forked from another design. " : ""}Finish editing and publish it to make it public.
              </p>
            </div>
            <Link href="/profile/edit"
              className="shrink-0 rounded-md bg-amber-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-amber-700 transition-colors">
              Go to your profile
            </Link>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main */}
          <div className="lg:col-span-2 space-y-6">
            {/* Image preview */}
            <div className="rounded-xl border bg-muted overflow-hidden aspect-[4/3] flex items-center justify-center">
              {imageFiles[0] ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={imageFiles[0].fileUrl} alt={design.title} className="h-full w-full object-contain" />
              ) : (
                <p className="text-sm text-muted-foreground">No preview available</p>
              )}
            </div>

            {/* Thumbnail strip */}
            {imageFiles.length > 1 && (
              <div className="flex gap-2 overflow-x-auto pb-1">
                {imageFiles.map((f, i) => (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img key={f.id} src={f.fileUrl} alt={`Preview ${i + 1}`}
                    className="h-16 w-20 object-cover rounded-md border shrink-0 cursor-pointer hover:opacity-80"
                  />
                ))}
              </div>
            )}

            {/* Title + meta */}
            <div>
              <div className="flex items-start justify-between gap-3 flex-wrap">
                <h1 className="text-2xl font-semibold">{design.title}</h1>
                <Badge variant={LICENSE_VARIANTS[design.licenseType] ?? "secondary"}>
                  {LICENSE_LABELS[design.licenseType] ?? design.licenseType}
                </Badge>
              </div>
              <div className="flex items-center gap-3 mt-2 text-sm text-muted-foreground flex-wrap">
                <Link href={`/profile/${design.author.designerProfile?.alias ?? design.author.id}`} className="hover:text-foreground font-medium">
                  {authorName}
                </Link>
                <span>·</span>
                <span>{design.category.replace(/_/g, " ")}</span>
                <span>·</span>
                <span>v{design.currentVersion}</span>
                <span>·</span>
                <span>{design.publishedAt ? timeAgo(design.publishedAt) : "Draft"}</span>
              </div>
            </div>

            {/* Stats row */}
            <div className="flex items-center gap-6 text-sm text-muted-foreground border-y py-3">
              <span className="flex items-center gap-1.5"><Heart className="h-4 w-4" />{formatNumber(design._count.likes)} likes</span>
              <span className="flex items-center gap-1.5"><GitFork className="h-4 w-4" />{formatNumber(design._count.forkRecords)} forks</span>
              <span className="flex items-center gap-1.5"><Download className="h-4 w-4" />{formatNumber(design.downloadCount)} downloads</span>
              <span className="flex items-center gap-1.5"><Users className="h-4 w-4" />{formatNumber(design.viewCount)} views</span>
            </div>

            {/* Actions */}
            <DesignActions
              designId={design.id}
              designSlug={design.slug}
              designTitle={design.title}
              authorId={design.authorId}
              initialLiked={userLiked}
              initialSaved={userSaved}
              initialLikes={design._count.likes}
              licenseType={design.licenseType}
              collab={design.licenseType === "COLLABORATION_ONLY"}
            />

            {/* Description */}
            {design.description && (
              <div>
                <h2 className="font-medium mb-2">About this design</h2>
                <p className="text-sm text-muted-foreground leading-relaxed whitespace-pre-line">{design.description}</p>
              </div>
            )}

            {/* Tags */}
            {design.tags.length > 0 && (
              <div className="flex flex-wrap gap-1.5">
                {design.tags.map(t => (
                  <span key={t} className="rounded-full border px-3 py-0.5 text-xs text-muted-foreground">{t}</span>
                ))}
              </div>
            )}

            {/* Design notes */}
            {design.designNotes && (
              <div>
                <h2 className="font-medium mb-2">Design notes</h2>
                <p className="text-sm text-muted-foreground leading-relaxed whitespace-pre-line">{design.designNotes}</p>
              </div>
            )}

            {/* Figma link */}
            {design.figmaLink && (
              <div>
                <h2 className="font-medium mb-2">Figma file</h2>
                <a href={design.figmaLink} target="_blank" rel="noopener noreferrer" className="text-sm text-blue-600 hover:underline">
                  Open in Figma ↗
                </a>
              </div>
            )}

            {/* Download files */}
            {downloadFiles.length > 0 && (
              <div>
                <h2 className="font-medium mb-3">Files included</h2>
                <div className="flex flex-col gap-2">
                  {downloadFiles.map(f => (
                    <div key={f.id} className="flex items-center gap-3 rounded-lg border bg-secondary/50 px-4 py-3">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{f.filename}</p>
                        <p className="text-xs text-muted-foreground">{formatBytes(f.fileSize)}</p>
                      </div>
                      <a href={`/api/designs/files/${f.id}/download`}
                        className="flex items-center gap-1.5 rounded-md border px-3 py-1.5 text-xs hover:bg-background transition-colors">
                        <Download className="h-3 w-3" /> Download
                      </a>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Version history */}
            {design.versions.length > 0 && (
              <div>
                <h2 className="font-medium mb-3">Version history</h2>
                <div className="flex flex-col gap-2">
                  {design.versions.map((v, i) => (
                    <div key={v.id} className="flex items-center gap-3 text-sm">
                      <div className={`h-2 w-2 rounded-full shrink-0 ${i === 0 ? "bg-green-500" : "bg-border"}`} />
                      <span className="font-medium w-10">v{v.versionNum}</span>
                      <span className="text-muted-foreground flex-1">{v.notes ?? "Update"}</span>
                      <span className="text-muted-foreground text-xs">{timeAgo(v.createdAt)}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Comments */}
            <CommentSection
              targetType="DESIGN"
              targetId={design.id}
              comments={comments as any}
              currentUserId={session?.user?.id}
            />
          </div>

          {/* Sidebar */}
          <div className="space-y-4">
            {/* Author card */}
            <div className="rounded-lg border p-4">
              <p className="text-xs text-muted-foreground mb-3">Designer</p>
              <Link href={`/profile/${design.author.designerProfile?.alias ?? design.author.id}`}
                className="flex items-center gap-3 hover:opacity-80">
                <div className="h-10 w-10 rounded-full bg-secondary border flex items-center justify-center text-sm font-medium shrink-0">
                  {authorName[0].toUpperCase()}
                </div>
                <div>
                  <p className="font-medium text-sm">{authorName}</p>
                  {design.author.designerProfile?.alias && (
                    <p className="text-xs text-muted-foreground">@{design.author.designerProfile.alias}</p>
                  )}
                </div>
              </Link>
              {design.author.designerProfile?.creativeScore && (
                <div className="mt-3 pt-3 border-t">
                  <p className="text-xs text-muted-foreground">Creative Score</p>
                  <p className="font-semibold text-lg mt-0.5">{design.author.designerProfile.creativeScore}</p>
                </div>
              )}
            </div>

            {/* Design stats */}
            <div className="rounded-lg border p-4 space-y-3">
              {[
                { label: "Views", value: formatNumber(design.viewCount) },
                { label: "Likes", value: formatNumber(design._count.likes) },
                { label: "Forks", value: formatNumber(design._count.forkRecords) },
                { label: "Downloads", value: formatNumber(design.downloadCount) },
                { label: "Version", value: `v${design.currentVersion}` },
              ].map(s => (
                <div key={s.label} className="flex justify-between items-center text-sm">
                  <span className="text-muted-foreground">{s.label}</span>
                  <span className="font-medium">{s.value}</span>
                </div>
              ))}
            </div>

            {/* Collaborators */}
            {design.collaborators.length > 0 && (
              <div className="rounded-lg border p-4">
                <p className="text-sm font-medium mb-3">Collaborators</p>
                <div className="flex flex-col gap-2">
                  {design.collaborators.filter(c => c.status === "ACCEPTED").map(c => (
                    <div key={c.id} className="flex items-center gap-2">
                      <div className="h-7 w-7 rounded-full bg-secondary border flex items-center justify-center text-xs font-medium">
                        {c.user.name?.[0]?.toUpperCase() ?? "?"}
                      </div>
                      <span className="text-sm">{c.user.designerProfile?.alias ?? c.user.name}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
