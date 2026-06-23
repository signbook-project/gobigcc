import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { targetUserId } = await req.json();
  if (targetUserId === session.user.id)
    return NextResponse.json({ error: "Cannot follow yourself" }, { status: 400 });

  const existing = await prisma.follow.findFirst({
    where: { followerId: session.user.id, followingId: targetUserId },
  });
  if (existing) return NextResponse.json({ error: "Already following" }, { status: 409 });

  await prisma.follow.create({
    data: { followerId: session.user.id, followingId: targetUserId },
  });

  return NextResponse.json({ success: true });
}

export async function DELETE(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { targetUserId } = await req.json();

  await prisma.follow.deleteMany({
    where: { followerId: session.user.id, followingId: targetUserId },
  });

  return NextResponse.json({ success: true });
}
