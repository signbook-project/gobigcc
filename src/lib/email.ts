import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);
const FROM = `${process.env.EMAIL_FROM_NAME ?? "GoBig.cc"} <${process.env.EMAIL_FROM ?? "noreply@gobig.cc"}>`;

// ─── Generic send ─────────────────────────────────────────────────────────────
async function sendEmail(to: string, subject: string, html: string) {
  if (!process.env.RESEND_API_KEY) {
    console.warn("[Email] RESEND_API_KEY not set — skipping send");
    return;
  }
  await resend.emails.send({ from: FROM, to, subject, html });
}

// ─── Templates ───────────────────────────────────────────────────────────────

export async function sendWelcomeEmail(to: string, name: string) {
  await sendEmail(
    to,
    "Welcome to GoBig.cc 🎉",
    `<p>Hi ${name},</p>
     <p>Welcome to GoBig.cc — the open design network where designers publish, collaborate, and get discovered.</p>
     <p><a href="${process.env.NEXT_PUBLIC_APP_URL}/designs">Explore designs →</a></p>
     <p>The GoBig Team</p>`
  );
}

export async function sendVerificationEmail(to: string, token: string) {
  const url = `${process.env.NEXT_PUBLIC_APP_URL}/verify-email?token=${token}`;
  await sendEmail(
    to,
    "Verify your GoBig.cc email",
    `<p>Click the link below to verify your email address:</p>
     <p><a href="${url}">Verify email →</a></p>
     <p>This link expires in 24 hours.</p>`
  );
}

export async function sendPasswordResetEmail(to: string, token: string) {
  const url = `${process.env.NEXT_PUBLIC_APP_URL}/reset-password?token=${token}`;
  await sendEmail(
    to,
    "Reset your GoBig.cc password",
    `<p>Click below to reset your password. This link expires in 1 hour.</p>
     <p><a href="${url}">Reset password →</a></p>
     <p>If you didn't request this, ignore this email.</p>`
  );
}

export async function sendCollaborationRequestEmail(
  to: string,
  requesterName: string,
  designTitle: string,
  designUrl: string
) {
  await sendEmail(
    to,
    `${requesterName} wants to collaborate on "${designTitle}"`,
    `<p>${requesterName} has sent you a collaboration request on your design <strong>${designTitle}</strong>.</p>
     <p><a href="${designUrl}">View and respond →</a></p>`
  );
}

export async function sendSubmissionStatusEmail(
  to: string,
  designerName: string,
  problemTitle: string,
  newStatus: string
) {
  await sendEmail(
    to,
    `Your submission to "${problemTitle}" was updated`,
    `<p>Hi ${designerName},</p>
     <p>Your submission to <strong>${problemTitle}</strong> has been updated to: <strong>${newStatus}</strong>.</p>
     <p><a href="${process.env.NEXT_PUBLIC_APP_URL}/problems">View challenge →</a></p>`
  );
}

export async function sendJobApplicationStatusEmail(
  to: string,
  applicantName: string,
  jobTitle: string,
  newStatus: string
) {
  await sendEmail(
    to,
    `Your application to "${jobTitle}" was updated`,
    `<p>Hi ${applicantName},</p>
     <p>Your application for <strong>${jobTitle}</strong> has been updated to: <strong>${newStatus}</strong>.</p>`
  );
}
