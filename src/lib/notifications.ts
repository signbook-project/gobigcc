import { prisma } from "@/lib/prisma";

type NotifPayload = {
  userId: string;
  type: string;
  title: string;
  body?: string;
  linkUrl?: string;
  metadata?: Record<string, any>;
};

export async function createNotification(payload: NotifPayload) {
  try {
    await prisma.notification.create({
      data: {
        userId: payload.userId,
        type: payload.type as any,
        title: payload.title,
        body: payload.body,
        linkUrl: payload.linkUrl,
        metadata: payload.metadata,
      },
    });
  } catch (err) {
    // Notifications are non-critical — log and continue
    console.error("[notification]", err);
  }
}

// ─── Named helpers for each event ────────────────────────────────────────────

export async function notifyNewFollower(followingId: string, followerName: string, followerAlias: string) {
  await createNotification({
    userId: followingId,
    type: "NEW_FOLLOWER",
    title: `${followerName} started following you`,
    linkUrl: `/profile/${followerAlias}`,
  });
}

export async function notifyDesignLiked(authorId: string, likerName: string, designTitle: string, designSlug: string) {
  await createNotification({
    userId: authorId,
    type: "DESIGN_LIKED",
    title: `${likerName} liked your design`,
    body: designTitle,
    linkUrl: `/designs/${designSlug}`,
  });
}

export async function notifyDesignForked(authorId: string, forkerName: string, designTitle: string, forkSlug: string) {
  await createNotification({
    userId: authorId,
    type: "DESIGN_FORKED",
    title: `${forkerName} forked your design`,
    body: designTitle,
    linkUrl: `/designs/${forkSlug}`,
  });
}

export async function notifyNewComment(
  authorId: string,
  commenterName: string,
  contentTitle: string,
  linkUrl: string,
  contentLabel: "design" | "challenge" | "job" | "article" = "design"
) {
  await createNotification({
    userId: authorId,
    type: "NEW_COMMENT",
    title: `${commenterName} commented on your ${contentLabel}`,
    body: contentTitle,
    linkUrl,
  });
}

export async function notifyCollaboratorRequest(ownerId: string, requesterName: string, designTitle: string, designSlug: string) {
  await createNotification({
    userId: ownerId,
    type: "NEW_COLLABORATOR_REQUEST",
    title: `${requesterName} wants to collaborate`,
    body: `On: ${designTitle}`,
    linkUrl: `/designs/${designSlug}`,
  });
}

export async function notifySubmissionStatus(designerId: string, problemTitle: string, newStatus: string, problemSlug: string) {
  const statusMessages: Record<string, string> = {
    SHORTLISTED: "Your solution was shortlisted! 🎉",
    WINNER: "You won the challenge! 🏆",
    REJECTED: "Your submission wasn't selected this time",
  };
  await createNotification({
    userId: designerId,
    type: "SUBMISSION_STATUS_CHANGED",
    title: statusMessages[newStatus] ?? `Submission updated: ${newStatus}`,
    body: problemTitle,
    linkUrl: `/problems/${problemSlug}`,
  });
}

export async function notifyJobApplicationStatus(applicantId: string, jobTitle: string, newStatus: string) {
  const statusMessages: Record<string, string> = {
    SHORTLISTED: "You've been shortlisted! 🎉",
    CONTACTED: "The company wants to connect with you",
    HIRED: "Congratulations — you got the job! 🎉",
    REJECTED: "Your application wasn't selected this time",
  };
  await createNotification({
    userId: applicantId,
    type: "JOB_APPLICATION_STATUS",
    title: statusMessages[newStatus] ?? `Application updated: ${newStatus}`,
    body: jobTitle,
    linkUrl: `/jobs`,
  });
}

export async function notifyMessageReceived(recipientId: string, senderName: string, senderId: string) {
  await createNotification({
    userId: recipientId,
    type: "MESSAGE_RECEIVED",
    title: `New message from ${senderName}`,
    linkUrl: `/messages?to=${senderId}`,
  });
}
