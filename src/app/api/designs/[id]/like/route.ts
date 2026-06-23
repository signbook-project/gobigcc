import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const existing = await prisma.designLike.findFirst({
    where: { designId: params.id, userId: session.user.id },
  });
  if (existing) return NextResponse.json({ error: "Already liked" }, { status: 409 });

  await prisma.$transaction([
    prisma.designLike.create({ data: { designId: params.id, userId: session.user.id } }),
    prisma.design.update({ where: { id: params.id }, data: { likeCount: { increment: 1 } } }),
  ]);

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
