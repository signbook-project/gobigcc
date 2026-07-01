import { auth } from "@/lib/auth";
import { notifyDesignForked } from "@/lib/notifications";
import { prisma } from "@/lib/prisma";
import { uniqueSlug } from "@/lib/utils";
import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const parent = await prisma.design.findUnique({
    where: { id: params.id },
    include: { files: true },
  });
  if (!parent) return NextResponse.json({ error: "Design not found" }, { status: 404 });
  if (parent.licenseType === "ROYALTY_BASED")
    return NextResponse.json({ error: "This design requires a license to fork" }, { status: 403 });

  const fork = await prisma.design.create({
    data: {
      title: `${parent.title} (fork)`,
      slug: uniqueSlug(`${parent.title} fork`),
      description: parent.description,
      designNotes: parent.designNotes,
      category: parent.category,
      tags: parent.tags,
      visibility: "DRAFT",
      licenseType: parent.licenseType,
      figmaLink: parent.figmaLink,
      parentDesignId: parent.id,
      authorId: session.user.id,
      files: {
        create: parent.files.map(f => ({
          filename: f.filename, fileUrl: f.fileUrl,
          fileType: f.fileType, fileSize: f.fileSize, sortOrder: f.sortOrder,
        })),
      },
    },
  });

  // Record fork + update parent count
  await prisma.$transaction([
    prisma.designFork.create({
      data: { parentDesignId: parent.id, forkedDesignId: fork.id, forkedById: session.user.id },
    }),
    prisma.design.update({ where: { id: parent.id }, data: { forkCount: { increment: 1 } } }),
  ]);

  // Boost creative score
  await prisma.designerProfile.updateMany({
    where: { userId: session.user.id },
    data: { creativeScore: { increment: 3 } },
  });

  // Notify the original author someone built on their work
  if (parent.authorId !== session.user.id) {
    const forker = await prisma.user.findUnique({
      where: { id: session.user.id },
      include: { designerProfile: true },
    });
    const forkerName = forker?.designerProfile?.alias ?? forker?.name ?? "Someone";
    notifyDesignForked(parent.authorId, forkerName, parent.title, fork.slug).catch(console.error);
  }

  return NextResponse.json({ success: true, slug: fork.slug, id: fork.id }, { status: 201 });
}
