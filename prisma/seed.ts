import { PrismaClient, Role, BillingCycle, AddOnType } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  console.log("🌱 Seeding database...");

  // ==========================================
  // SYSTEM CONFIG
  // ==========================================
  await prisma.systemConfig.upsert({
    where: { id: "default-system" },
    update: {},
    create: {
      id: "default-system",
      systemName: "Patholab Cloud",
      systemEmail: "support@patholab.com",
      systemPhone: "9999999999",
      systemAddress: "India",
      gstNumber: "22AAAAA0000A1Z5",
      panNumber: "AAAAA0000A",
      invoicePrefix: "SAAS",
      currency: "INR",
      currencySymbol: "₹",
      taxRate: 18,
    },
  });

  // ==========================================
  // PLANS
  // ==========================================
  await prisma.plan.createMany({
    data: [
      {
        name: "starter_monthly",
        displayName: "Starter Plan",
        price: 999,
        billingCycle: BillingCycle.MONTHLY,
        maxTestsPerMonth: 100,
        maxPatientsTotal: 1000,
        maxStaff: 2,
        maxStorageGB: 1,
        hasInventory: false,
        hasAnalytics: false,
        hasB2bBilling: false,
        hasWhatsapp: false,
        hasAiPrediction: false,
        hasApiAccess: false,
        isPopular: false,
      },
      {
        name: "pro_monthly",
        displayName: "Pro Plan",
        price: 2999,
        billingCycle: BillingCycle.MONTHLY,
        maxTestsPerMonth: 1000,
        maxPatientsTotal: 10000,
        maxStaff: 10,
        maxStorageGB: 10,
        hasInventory: true,
        hasAnalytics: true,
        hasB2bBilling: true,
        hasWhatsapp: true,
        hasAiPrediction: true,
        hasApiAccess: true,
        isPopular: true,
      },
      {
        name: "enterprise_monthly",
        displayName: "Enterprise Plan",
        price: 9999,
        billingCycle: BillingCycle.MONTHLY,
        maxTestsPerMonth: -1,
        maxPatientsTotal: -1,
        maxStaff: -1,
        maxStorageGB: 100,
        hasInventory: true,
        hasAnalytics: true,
        hasB2bBilling: true,
        hasWhatsapp: true,
        hasAiPrediction: true,
        hasApiAccess: true,
        hasWhiteLabel: true,
        isPopular: false,
      },
    ],
    skipDuplicates: true,
  });

  // ==========================================
  // ADD-ONS
  // ==========================================
  await prisma.addOn.createMany({
    data: [
      {
        name: "50 Test Booster",
        price: 199,
        type: AddOnType.TEST_LIMIT,
        value: 50,
      },
      {
        name: "1GB Storage Booster",
        price: 99,
        type: AddOnType.STORAGE_LIMIT,
        value: 1,
      },
      {
        name: "Extra Staff Seat",
        price: 299,
        type: AddOnType.STAFF_LIMIT,
        value: 1,
      },
    ],
    skipDuplicates: true,
  });

  // ==========================================
  // SUPER ADMIN USER
  // ==========================================
  const hashedPassword = await bcrypt.hash("admin123", 10);

  await prisma.user.upsert({
    where: { email: "admin@patholab.com" },
    update: {},
    create: {
      email: "admin@patholab.com",
      password: hashedPassword,
      name: "Super Admin",
      role: Role.SUPER_ADMIN,
      isActive: true,
      emailVerified: true,
    },
  });

  console.log("✅ Seeding completed!");
}

main()
  .catch((e) => {
    console.error("❌ Error seeding:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });