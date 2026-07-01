import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function PATCH(req: NextRequest) {
  const session = await auth();
  if (!session || (session.user as any).role !== "ADMIN")
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { corporateId, verified } = await req.json();
  if (!corporateId) return NextResponse.json({ error: "corporateId required" }, { status: 400 });

  const profile = await prisma.corporateProfile.update({
    where: { id: corporateId },
    data: { verified: !!verified },
  });

  await prisma.auditLog.create({
    data: {
      actorId: session.user.id,
      action: "corporate.verify",
      targetType: "CorporateProfile",
      targetId: corporateId,
      metadata: { verified: !!verified },
    },
  });

  return NextResponse.json({ success: true, profile });
}
