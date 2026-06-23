import { notFound } from "next/navigation";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { Navbar } from "@/components/layout/Navbar";
import { Badge } from "@/components/ui/Card";
import { DesignCard } from "@/components/design/DesignCard";
import { auth } from "@/lib/auth";
import { formatNumber } from "@/lib/utils";
import { MapPin, Globe, Trophy, GitFork, Heart, Star, MessageCircle } from "lucide-react";
import { FollowButton } from "@/components/profile/FollowButton";
import type { DesignCard as DesignCardType } from "@/types";

export default async function ProfilePage({ params }: { params: { username: string } }) {
  const session = await auth();

  // Find by alias or by user id
  const designerProfile = await prisma.designerProfile.findFirst({
    where: {
      OR: [
        { alias: params.username },
        { userId: params.username },
      ],
    },
    include: {
      user: true,
    },
  });
  if (!designerProfile) notFound();

  const user = designerProfile.user;

  // Stats
  const [
    designs,
    totalLikes,
    totalForks,
    challengeWins,
    followerCount,
    followingCount,
    isFollowing,
    savedDesigns,
  ] = await Promise.all([
    prisma.design.findMany({
      where: { authorId: user.id, visibility: "PUBLIC" },
      orderBy: { likeCount: "desc" },
      take: 12,
      include: {
        author: { include: { designerProfile: true } },
        files: { take: 1, orderBy: { sortOrder: "asc" } },
        _count: { select: { likes: true, saves: true, comments: true } },
      },
    }),
    prisma.designLike.count({
      where: { design: { authorId: user.id } },
    }),
    prisma.designFork.count({
      where: { parentDesign: { authorId: user.id } },
    }),
    prisma.problemSubmission.count({
      where: { designerId: user.id, status: "WINNER" },
    }),
    prisma.follow.count({ where: { followingId: user.id } }),
    prisma.follow.count({ where: { followerId: user.id } }),
    session?.user
      ? prisma.follow.findFirst({ where: { followerId: session.user.id, followingId: user.id } })
      : null,
    session?.user?.id === user.id
      ? prisma.designSave.findMany({
          where: { userId: user.id },
          include: {
            design: {
              include: {
                author: { include: { designerProfile: true } },
                files: { take: 1, orderBy: { sortOrder: "asc" } },
                _count: { select: { likes: true, saves: true, comments: true } },
              },
            },
          },
          take: 6,
        })
      : [],
  ]);

  const displayName = designerProfile.alias ?? user.name ?? "Designer";
  const isOwn = session?.user?.id === user.id;

  return (
    <>
      <Navbar />
      <div className="mx-auto max-w-5xl px-4 py-8">
        {/* Profile hero */}
        <div className="rounded-xl border bg-card p-6 mb-8">
          <div className="flex items-start gap-5 flex-wrap">
            {/* Avatar */}
            <div className="h-20 w-20 rounded-full bg-secondary border-2 flex items-center justify-center text-2xl font-semibold shrink-0">
              {displayName[0].toUpperCase()}
            </div>

            {/* Info */}
            <div className="flex-1 min-w-0">
              <div className="flex items-start justify-between gap-3 flex-wrap">
                <div>
                  <h1 className="text-2xl font-semibold">{displayName}</h1>
                  {designerProfile.alias && (
                    <p className="text-sm text-muted-foreground mt-0.5">@{designerProfile.alias}</p>
                  )}
                </div>
                <div className="flex gap-2">
                  {isOwn ? (
                    <Link href="/profile/edit"
                      className="rounded-md border px-4 py-2 text-sm font-medium hover:bg-secondary transition-colors">
                      Edit profile
                    </Link>
                  ) : (
                    <>
                      <FollowButton
                        targetUserId={user.id}
                        initialFollowing={!!isFollowing}
                      />
                      <Link href={`/messages?to=${user.id}`}
                        className="flex items-center gap-1.5 rounded-md border px-4 py-2 text-sm hover:bg-secondary transition-colors">
                        <MessageCircle className="h-4 w-4" /> Message
                      </Link>
                    </>
                  )}
                </div>
              </div>

              {designerProfile.bio && (
                <p className="text-sm text-muted-foreground mt-2 max-w-xl leading-relaxed">
                  {designerProfile.bio}
                </p>
              )}

              <div className="flex flex-wrap items-center gap-4 mt-3 text-sm text-muted-foreground">
                {designerProfile.country && (
                  <span className="flex items-center gap-1"><MapPin className="h-3.5 w-3.5" />{designerProfile.country}</span>
                )}
                {designerProfile.website && (
                  <a href={designerProfile.website} target="_blank" rel="noopener noreferrer"
                    className="flex items-center gap-1 hover:text-foreground">
                    <Globe className="h-3.5 w-3.5" />{designerProfile.website.replace(/^https?:\/\//, "")}
                  </a>
                )}
              </div>

              {/* Skills */}
              {designerProfile.skills.length > 0 && (
                <div className="flex flex-wrap gap-1.5 mt-3">
                  {designerProfile.skills.map(s => (
                    <span key={s} className="rounded-full border px-2.5 py-0.5 text-xs text-muted-foreground">
                      {s}
                    </span>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Stats row */}
          <div className="grid grid-cols-3 sm:grid-cols-6 gap-4 mt-6 pt-5 border-t">
            {[
              { label: "Designs", value: formatNumber(designs.length), icon: Star },
              { label: "Likes received", value: formatNumber(totalLikes), icon: Heart },
              { label: "Forks received", value: formatNumber(totalForks), icon: GitFork },
              { label: "Challenge wins", value: formatNumber(challengeWins), icon: Trophy },
              { label: "Followers", value: formatNumber(followerCount), icon: null },
              { label: "Following", value: formatNumber(followingCount), icon: null },
            ].map(s => (
              <div key={s.label} className="text-center">
                <div className="text-xl font-semibold">{s.value}</div>
                <div className="text-xs text-muted-foreground mt-0.5">{s.label}</div>
              </div>
            ))}
          </div>

          {/* Creative Score */}
          <div className="mt-5 pt-5 border-t">
            <div className="flex items-center justify-between mb-2">
              <div>
                <span className="text-sm font-medium">Creative Score</span>
                <span className="ml-2 text-2xl font-semibold">{designerProfile.creativeScore}</span>
              </div>
              <Badge variant={
                designerProfile.creativeScore >= 1000 ? "success"
                : designerProfile.creativeScore >= 500 ? "info"
                : "secondary"
              }>
                {designerProfile.creativeScore >= 1000 ? "Elite"
                  : designerProfile.creativeScore >= 500 ? "Pro"
                  : designerProfile.creativeScore >= 100 ? "Rising"
                  : "Newcomer"}
              </Badge>
            </div>
            <div className="h-2 rounded-full bg-secondary overflow-hidden">
              <div
                className="h-full bg-primary rounded-full transition-all"
                style={{ width: `${Math.min(100, (designerProfile.creativeScore / 2000) * 100)}%` }}
              />
            </div>
            <p className="text-xs text-muted-foreground mt-1.5">
              Score increases with designs published, likes, forks, and challenge wins.
            </p>
          </div>
        </div>

        {/* Designs grid */}
        <div>
          <h2 className="text-lg font-semibold mb-4">Designs ({designs.length})</h2>
          {designs.length === 0 ? (
            <div className="rounded-lg border p-12 text-center text-muted-foreground text-sm">
              {isOwn ? (
                <>No designs yet. <Link href="/designs/new" className="underline">Publish your first design →</Link></>
              ) : (
                "No public designs yet."
              )}
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
              {designs.map(d => (
                <DesignCard key={d.id} design={d as unknown as DesignCardType} />
              ))}
            </div>
          )}
        </div>

        {/* Saved designs — only show to owner */}
        {isOwn && savedDesigns.length > 0 && (
          <div className="mt-10">
            <h2 className="text-lg font-semibold mb-4">Saved designs</h2>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
              {savedDesigns.map(({ design: d }) => (
                <DesignCard key={d.id} design={d as unknown as DesignCardType} />
              ))}
            </div>
          </div>
        )}
      </div>
    </>
  );
}
