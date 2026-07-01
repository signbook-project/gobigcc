import { Navbar } from "@/components/layout/Navbar";
import { SubmitSolutionForm } from "@/components/problems/SubmitSolutionForm";
import { CommentSection } from "@/components/shared/CommentSection";
import { ShareButton } from "@/components/shared/ShareButton";
import { Badge } from "@/components/ui/Card";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { formatCurrency, timeAgo } from "@/lib/utils";
import { Building, ChevronLeft, Clock, Trophy, Users } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";

const STATUS_VARIANTS: Record<string, any> = {
  ACCEPTING_SOLUTIONS: "success",
  REVIEWING: "warning",
  WINNER_SELECTED: "info",
  CLOSED: "secondary",
};
const STATUS_LABELS: Record<string, string> = {
  ACCEPTING_SOLUTIONS: "Accepting solutions",
  REVIEWING: "Under review",
  WINNER_SELECTED: "Winner selected",
  CLOSED: "Closed",
};

export default async function ProblemDetailPage({ params }: { params: { slug: string } }) {
  const session = await auth();

  const problem = await prisma.problem.findUnique({
    where: { slug: params.slug },
    include: {
      corporate: { include: { user: true } },
      _count: { select: { submissions: true } },
    },
  });
  if (!problem) notFound();

  const daysLeft = problem.deadline
    ? Math.max(0, Math.ceil((problem.deadline.getTime() - Date.now()) / 86400_000))
    : null;

  // Check if current user already submitted
  let alreadySubmitted = false;
  if (session?.user) {
    const existing = await prisma.problemSubmission.findFirst({
      where: { problemId: problem.id, designerId: session.user.id },
    });
    alreadySubmitted = !!existing;
  }

  const comments = await prisma.comment.findMany({
    where: { problemId: problem.id, parentId: null },
    include: {
      author: { include: { designerProfile: true } },
      replies: { include: { author: { include: { designerProfile: true } } } },
    },
    orderBy: { createdAt: "desc" },
    take: 20,
  });

  return (
    <>
      <Navbar />
      <div className="mx-auto max-w-4xl px-4 py-8">
        <Link href="/problems" className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground mb-6">
          <ChevronLeft className="h-4 w-4" /> Back to challenges
        </Link>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main */}
          <div className="lg:col-span-2 space-y-6">
            <div>
              <div className="flex items-start justify-between gap-3 flex-wrap">
                <h1 className="text-2xl font-semibold">{problem.title}</h1>
                <div className="flex items-center gap-2">
                  <Badge variant={STATUS_VARIANTS[problem.status] ?? "secondary"}>
                    {STATUS_LABELS[problem.status] ?? problem.status}
                  </Badge>
                  <ShareButton url={`/problems/${problem.slug}`} title={problem.title} />
                </div>
              </div>
              <div className="flex items-center gap-4 mt-3 text-sm text-muted-foreground flex-wrap">
                <span className="flex items-center gap-1.5">
                  <Building className="h-3.5 w-3.5" />
                  {problem.corporate.companyName}
                </span>
                <span className="flex items-center gap-1.5">
                  <Users className="h-3.5 w-3.5" />
                  {problem._count.submissions} submissions
                </span>
                <span>Posted {timeAgo(problem.createdAt)}</span>
              </div>
            </div>

            <div>
              <h2 className="font-medium mb-2">Brief</h2>
              <p className="text-sm text-muted-foreground leading-relaxed whitespace-pre-line">{problem.description}</p>
            </div>

            {problem.background && (
              <div>
                <h2 className="font-medium mb-2">Background</h2>
                <p className="text-sm text-muted-foreground leading-relaxed whitespace-pre-line">{problem.background}</p>
              </div>
            )}

            {problem.deliverables && (
              <div>
                <h2 className="font-medium mb-2">Deliverables</h2>
                <p className="text-sm text-muted-foreground leading-relaxed whitespace-pre-line">{problem.deliverables}</p>
              </div>
            )}

            {problem.constraints && (
              <div>
                <h2 className="font-medium mb-2">Constraints</h2>
                <p className="text-sm text-muted-foreground leading-relaxed whitespace-pre-line">{problem.constraints}</p>
              </div>
            )}

            {/* Submit solution */}
            {session?.user && problem.status === "ACCEPTING_SOLUTIONS" && (
              <div className="border rounded-lg p-5">
                <h2 className="font-medium mb-4">
                  {alreadySubmitted ? "Your submission" : "Submit your solution"}
                </h2>
                {alreadySubmitted ? (
                  <p className="text-sm text-muted-foreground">
                    You've already submitted a solution for this challenge.{" "}
                    <Link href="/profile" className="underline">View in your profile →</Link>
                  </p>
                ) : (
                  <SubmitSolutionForm problemId={problem.id} />
                )}
              </div>
            )}

            {!session?.user && problem.status === "ACCEPTING_SOLUTIONS" && (
              <div className="border rounded-lg p-5 text-center">
                <p className="text-sm text-muted-foreground mb-3">Sign in to submit your solution</p>
                <Link href="/login" className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground">
                  Sign in to participate
                </Link>
              </div>
            )}

            <CommentSection
              targetType="PROBLEM"
              targetId={problem.id}
              comments={comments as any}
              currentUserId={session?.user?.id}
              heading="Discussion"
              emptyText="No questions or comments yet. Ask the company anything about this brief."
            />
          </div>

          {/* Sidebar */}
          <div className="space-y-4">
            <div className="rounded-lg border p-4 space-y-4">
              <div>
                <p className="text-xs text-muted-foreground mb-1">Reward</p>
                <p className="font-semibold text-green-700 flex items-center gap-1.5">
                  <Trophy className="h-4 w-4" />
                  {problem.rewardType === "CASH" && problem.rewardAmount
                    ? formatCurrency(problem.rewardAmount)
                    : problem.rewardType}
                </p>
                {problem.rewardDetails && (
                  <p className="text-xs text-muted-foreground mt-1">{problem.rewardDetails}</p>
                )}
              </div>
              {daysLeft !== null && (
                <div>
                  <p className="text-xs text-muted-foreground mb-1">Deadline</p>
                  <p className="font-medium flex items-center gap-1.5">
                    <Clock className="h-4 w-4 text-muted-foreground" />
                    {daysLeft > 0 ? `${daysLeft} days left` : "Deadline passed"}
                  </p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {problem.deadline?.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}
                  </p>
                </div>
              )}
              <div>
                <p className="text-xs text-muted-foreground mb-1">Category</p>
                <p className="text-sm font-medium">{problem.category.replace(/_/g, " ")}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground mb-1">Posted by</p>
                <div className="flex items-center gap-2">
                  <div className="h-7 w-7 rounded-full bg-secondary border flex items-center justify-center text-xs font-medium">
                    {problem.corporate.companyName[0]}
                  </div>
                  <span className="text-sm font-medium">{problem.corporate.companyName}</span>
                  {problem.corporate.verified && (
                    <Badge variant="info" className="text-[10px] px-1.5 py-0">Verified</Badge>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
