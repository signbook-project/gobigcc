import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function PATCH(req: NextRequest) {
  const session = await auth();
  if (!session || (session.user as any).role !== "ADMIN")
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { problemId, status } = await req.json();
  if (!problemId || !status) return NextResponse.json({ error: "problemId and status required" }, { status: 400 });

  const problem = await prisma.problem.update({ where: { id: problemId }, data: { status } });

  await prisma.auditLog.create({
    data: { actorId: session.user.id, action: "problem.update", targetType: "Problem", targetId: problemId, metadata: { status } },
  });

  return NextResponse.json({ success: true, problem });
}
