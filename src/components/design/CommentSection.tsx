"use client";

import { useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { timeAgo } from "@/lib/utils";
import { Button } from "@/components/ui/Button";
import { useToast } from "@/components/ui/Toaster";
import Link from "next/link";

interface CommentUser {
  id: string;
  name: string | null;
  designerProfile: { alias: string | null } | null;
}

interface Comment {
  id: string;
  content: string;
  createdAt: string | Date;
  author: CommentUser;
  replies: Comment[];
}

interface Props {
  designId: string;
  comments: Comment[];
  currentUserId?: string;
}

function CommentItem({ comment, designId, onReply }: {
  comment: Comment;
  designId: string;
  onReply: (parentId: string, content: string) => Promise<void>;
}) {
  const [showReply, setShowReply] = useState(false);
  const [replyText, setReplyText] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const authorName = comment.author.designerProfile?.alias ?? comment.author.name ?? "Designer";

  async function submitReply() {
    if (!replyText.trim()) return;
    setSubmitting(true);
    await onReply(comment.id, replyText);
    setSubmitting(false);
    setReplyText("");
    setShowReply(false);
  }

  return (
    <div className="flex gap-3">
      <div className="h-8 w-8 rounded-full bg-secondary border flex items-center justify-center text-xs font-medium shrink-0 mt-0.5">
        {authorName[0].toUpperCase()}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-baseline gap-2">
          <Link href={`/profile/${comment.author.designerProfile?.alias ?? comment.author.id}`}
            className="text-sm font-medium hover:underline">
            {authorName}
          </Link>
          <span className="text-xs text-muted-foreground">{timeAgo(comment.createdAt)}</span>
        </div>
        <p className="text-sm text-muted-foreground mt-0.5 leading-relaxed">{comment.content}</p>
        <button
          onClick={() => setShowReply(v => !v)}
          className="text-xs text-muted-foreground hover:text-foreground mt-1"
        >
          Reply
        </button>

        {showReply && (
          <div className="flex gap-2 mt-2">
            <input
              className="flex-1 h-8 rounded-md border bg-background px-3 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring"
              placeholder="Write a reply…"
              value={replyText}
              onChange={e => setReplyText(e.target.value)}
              onKeyDown={e => { if (e.key === "Enter") submitReply(); }}
            />
            <Button size="sm" onClick={submitReply} loading={submitting}>Post</Button>
          </div>
        )}

        {/* Replies */}
        {comment.replies.length > 0 && (
          <div className="mt-3 flex flex-col gap-3 pl-4 border-l">
            {comment.replies.map(reply => (
              <div key={reply.id} className="flex gap-2">
                <div className="h-6 w-6 rounded-full bg-secondary border flex items-center justify-center text-xs font-medium shrink-0">
                  {(reply.author.designerProfile?.alias ?? reply.author.name ?? "?")[0].toUpperCase()}
                </div>
                <div>
                  <div className="flex items-baseline gap-2">
                    <span className="text-xs font-medium">
                      {reply.author.designerProfile?.alias ?? reply.author.name ?? "Designer"}
                    </span>
                    <span className="text-xs text-muted-foreground">{timeAgo(reply.createdAt)}</span>
                  </div>
                  <p className="text-sm text-muted-foreground mt-0.5">{reply.content}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export function CommentSection({ designId, comments: initial, currentUserId }: Props) {
  const { data: session } = useSession();
  const router = useRouter();
  const { error } = useToast();
  const [comments, setComments] = useState<Comment[]>(initial);
  const [newComment, setNewComment] = useState("");
  const [posting, setPosting] = useState(false);

  async function postComment() {
    if (!session) { router.push("/login"); return; }
    if (!newComment.trim()) return;
    setPosting(true);
    const res = await fetch("/api/comments", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ designId, content: newComment, targetType: "DESIGN" }),
    });
    setPosting(false);
    if (res.ok) {
      const d = await res.json();
      setComments(prev => [d.comment, ...prev]);
      setNewComment("");
    } else {
      error("Failed to post comment");
    }
  }

  async function postReply(parentId: string, content: string) {
    if (!session) return;
    const res = await fetch("/api/comments", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ designId, content, targetType: "DESIGN", parentId }),
    });
    if (res.ok) {
      const d = await res.json();
      setComments(prev => prev.map(c =>
        c.id === parentId ? { ...c, replies: [...c.replies, d.comment] } : c
      ));
    }
  }

  return (
    <div>
      <h2 className="font-medium mb-4">Comments ({comments.length})</h2>

      {/* New comment */}
      <div className="flex gap-3 mb-6">
        {session ? (
          <>
            <div className="h-8 w-8 rounded-full bg-secondary border flex items-center justify-center text-xs font-medium shrink-0">
              {session.user.name?.[0]?.toUpperCase() ?? session.user.email[0].toUpperCase()}
            </div>
            <div className="flex-1 flex gap-2">
              <input
                className="flex-1 h-9 rounded-md border bg-background px-3 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring"
                placeholder="Add a comment…"
                value={newComment}
                onChange={e => setNewComment(e.target.value)}
                onKeyDown={e => { if (e.key === "Enter") postComment(); }}
              />
              <Button size="sm" onClick={postComment} loading={posting}>Post</Button>
            </div>
          </>
        ) : (
          <p className="text-sm text-muted-foreground">
            <Link href="/login" className="underline">Sign in</Link> to leave a comment
          </p>
        )}
      </div>

      {/* Comments list */}
      {comments.length === 0 ? (
        <p className="text-sm text-muted-foreground">No comments yet. Be the first!</p>
      ) : (
        <div className="flex flex-col gap-5">
          {comments.map(c => (
            <CommentItem key={c.id} comment={c} designId={designId} onReply={postReply} />
          ))}
        </div>
      )}
    </div>
  );
}
