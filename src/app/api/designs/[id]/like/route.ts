import { auth } from "@/lib/auth";
import { notifyDesignLiked } from "@/lib/notifications";
import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const existing = await prisma.designLike.findFirst({
    where: { designId: params.id, userId: session.user.id },
  });
  if (existing) return NextResponse.json({ error: "Already liked" }, { status: 409 });

  const [, design] = await prisma.$transaction([
    prisma.designLike.create({ data: { designId: params.id, userId: session.user.id } }),
    prisma.design.update({ where: { id: params.id }, data: { likeCount: { increment: 1 } } }),
  ]);

  if (design.authorId !== session.user.id) {
    const liker = await prisma.user.findUnique({
      where: { id: session.user.id },
      include: { designerProfile: true },
    });
    const likerName = liker?.designerProfile?.alias ?? liker?.name ?? "Someone";
    notifyDesignLiked(design.authorId, likerName, design.title, design.slug).catch(console.error);
  }

  return NextResponse.json({ success: true });
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const existing = await prisma.designLike.findFirst({
    where: { designId: params.id, userId: session.user.id },
  });
  if (!existing) return NextResponse.json({ error: "Not liked" }, { status: 404 });

  await prisma.$transaction([
    prisma.designLike.delete({ where: { id: existing.id } }),
    prisma.design.update({ where: { id: params.id }, data: { likeCount: { decrement: 1 } } }),
  ]);

  return NextResponse.json({ success: true });
}
