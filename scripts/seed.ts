/**
 * GoBig.cc — Database seed script
 * Run: npm run db:seed
 *
 * Creates:
 * - Admin user: admin@gobig.cc / Billionapp@100!
 * - Sample designer and corporate users
 * - Platform settings defaults
 */

import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

const ADMIN_EMAIL = "admin@gobig.cc";
const ADMIN_PASSWORD = "Billionapp@100!";

async function main() {
  console.log("🌱 Seeding GoBig.cc database…\n");

  // ─── Admin ──────────────────────────────────────────────────────────────────
  const adminHash = await bcrypt.hash(ADMIN_PASSWORD, 12);
  const admin = await prisma.user.upsert({
    where: { email: ADMIN_EMAIL },
    update: {},
    create: {
      email: ADMIN_EMAIL,
      name: "GoBig Admin",
      passwordHash: adminHash,
      role: "ADMIN",
      status: "ACTIVE",
      emailVerified: new Date(),
    },
  });
  console.log(`✅ Admin created: ${admin.email}`);

  // ─── Default platform settings ───────────────────────────────────────────────
  const defaults: Array<{ section: string; key: string; value: string; isSecret?: boolean }> = [
    // Email
    { section: "email", key: "smtp_host", value: "smtp.mailgun.org" },
    { section: "email", key: "smtp_port", value: "587" },
    { section: "email", key: "smtp_encryption", value: "TLS" },
    { section: "email", key: "from_address", value: "noreply@gobig.cc" },
    { section: "email", key: "from_name", value: "GoBig.cc" },
    // Platform
    { section: "platform", key: "site_name", value: "GoBig.cc" },
    { section: "platform", key: "app_url", value: "https://gobig.cc" },
    { section: "platform", key: "max_upload_mb", value: "200" },
    { section: "platform", key: "designs_per_page", value: "24" },
    { section: "platform", key: "feature_registrations", value: "true" },
    { section: "platform", key: "feature_payments", value: "true" },
    { section: "platform", key: "feature_editorial", value: "true" },
    { section: "platform", key: "feature_anon_publish", value: "true" },
    // Moderation
    { section: "moderation", key: "auto_flag_reports_threshold", value: "3" },
    { section: "moderation", key: "auto_suspend_threshold", value: "10" },
    // Payments
    { section: "payments", key: "platform_fee_percent", value: "10" },
    { section: "payments", key: "escrow_release_days", value: "14" },
  ];

  for (const s of defaults) {
    await prisma.platformSetting.upsert({
      where: { section_key: { section: s.section, key: s.key } },
      update: {},
      create: { ...s, isSecret: s.isSecret ?? false, updatedBy: admin.id },
    });
  }
  console.log(`✅ ${defaults.length} platform settings seeded`);

  // ─── Sample designer ─────────────────────────────────────────────────────────
  const designerHash = await bcrypt.hash("Designer@123", 12);
  const designer = await prisma.user.upsert({
    where: { email: "designer@example.com" },
    update: {},
    create: {
      email: "designer@example.com",
      name: "Arnav Joshi",
      passwordHash: designerHash,
      role: "DESIGNER",
      status: "ACTIVE",
      emailVerified: new Date(),
      designerProfile: {
        create: {
          alias: "UrbanMaker",
          bio: "Designing modular, sustainable systems for shared spaces.",
          skills: ["Product Design", "CAD", "SolidWorks", "Figma"],
          creativeScore: 824,
        },
      },
    },
  });
  console.log(`✅ Sample designer: ${designer.email}`);

  // ─── Sample corporate ────────────────────────────────────────────────────────
  const corpHash = await bcrypt.hash("Corp@123!", 12);
  const corporate = await prisma.user.upsert({
    where: { email: "hr@retailco.com" },
    update: {},
    create: {
      email: "hr@retailco.com",
      name: "RetailCo HR",
      passwordHash: corpHash,
      role: "CORPORATE",
      status: "ACTIVE",
      emailVerified: new Date(),
      corporateProfile: {
        create: {
          companyName: "RetailCo",
          industry: "Retail",
          country: "IN",
          verified: true,
        },
      },
    },
  });
  console.log(`✅ Sample corporate: ${corporate.email}`);

  // ─── Sample design ───────────────────────────────────────────────────────────
  await prisma.design.upsert({
    where: { slug: "modular-seating-system-abc12" },
    update: {},
    create: {
      title: "Modular seating system",
      slug: "modular-seating-system-abc12",
      description: "A fully modular seating system designed for co-working spaces.",
      category: "PRODUCT_DESIGN",
      tags: ["furniture", "modular", "sustainable"],
      visibility: "PUBLIC",
      licenseType: "OPEN_SOURCE",
      authorId: designer.id,
      publishedAt: new Date(),
      likeCount: 284,
      viewCount: 2100,
      forkCount: 18,
    },
  });
  console.log("✅ Sample design seeded");

  // ─── Sample challenge ────────────────────────────────────────────────────────
  const corpProfile = await prisma.corporateProfile.findUnique({ where: { userId: corporate.id } });
  if (corpProfile) {
    await prisma.problem.upsert({
      where: { slug: "sustainable-retail-display-2026" },
      update: {},
      create: {
        title: "Sustainable retail display",
        slug: "sustainable-retail-display-2026",
        description: "Design a modular retail display from recycled materials for pop-up retail events.",
        background: "RetailCo is expanding into pop-up retail and needs eco-friendly display solutions.",
        deliverables: "CAD files, renders, material spec sheet",
        category: "PACKAGING",
        status: "ACCEPTING_SOLUTIONS",
        rewardType: "CASH",
        rewardAmount: 5000,
        deadline: new Date(Date.now() + 21 * 86400_000),
        corporateId: corpProfile.id,
        publishedAt: new Date(),
      },
    });
    console.log("✅ Sample challenge seeded");
  }

  console.log("\n✨ Seed complete!\n");
  console.log("Admin login:");
  console.log(`  Email:    ${ADMIN_EMAIL}`);
  console.log(`  Password: ${ADMIN_PASSWORD}`);
  console.log("\nSample accounts:");
  console.log("  designer@example.com / Designer@123");
  console.log("  hr@retailco.com / Corp@123!");
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
