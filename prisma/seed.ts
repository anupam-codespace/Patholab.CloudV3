import { PrismaClient, BillingCycle } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting database seed for WooCommerce Plans...');

  // ==========================================
  // 1. BASIC PLAN (Tier 1)
  // ==========================================
  const basicFeatures = JSON.stringify([
    "1 Branch Location",
    "Patient Registration & Billing",
    "Lab Tests & Standard Reports",
    "Barcode Generation on Bills",
    "Up to 1,200 tests/month"
  ]);

  await prisma.plan.upsert({
    where: { name: 'BASIC_MONTHLY' },
    update: {},
    create: {
      name: 'BASIC_MONTHLY', // MUST MATCH WOOCOMMERCE SKU EXACTLY
      displayName: 'Patholab Cloud - Basic (Monthly)',
      description: 'The perfect plan for independent labs starting their digital journey.',
      price: 299,
      billingCycle: BillingCycle.MONTHLY,
      maxTestsPerMonth: 1200,
      maxPatientsTotal: 5000,
      maxStaff: 3,
      maxStorageGB: 1.0,
      maxBranches: 1,
      hasB2bBilling: false,
      hasWhatsapp: false,
      hasExpenses: true,
      features: basicFeatures,
    },
  });

  await prisma.plan.upsert({
    where: { name: 'BASIC_YEARLY' },
    update: {},
    create: {
      name: 'BASIC_YEARLY',
      displayName: 'Patholab Cloud - Basic (Yearly)',
      description: 'The perfect plan for independent labs starting their digital journey.',
      price: 2870,
      billingCycle: BillingCycle.YEARLY,
      maxTestsPerMonth: 1200,
      maxPatientsTotal: 5000,
      maxStaff: 3,
      maxStorageGB: 1.0,
      maxBranches: 1,
      hasB2bBilling: false,
      hasWhatsapp: false,
      hasExpenses: true,
      features: basicFeatures,
    },
  });

  // ==========================================
  // 2. GROWTH PLAN (Tier 2 - Most Popular)
  // ==========================================
  const growthFeatures = JSON.stringify([
    "Up to 2 Branch Locations",
    "Everything in Basic",
    "Custom Report Formats & Letterheads",
    "QR Code on Bills & Final Reports",
    "Up to 5,000 tests/month"
  ]);

  await prisma.plan.upsert({
    where: { name: 'GROWTH_MONTHLY' },
    update: {},
    create: {
      name: 'GROWTH_MONTHLY',
      displayName: 'Patholab Cloud - Growth (Monthly)',
      description: 'The engine for scaling labs. Build trust with custom reporting.',
      price: 399,
      billingCycle: BillingCycle.MONTHLY,
      isPopular: true,
      maxTestsPerMonth: 5000,
      maxPatientsTotal: 25000,
      maxStaff: 8,
      maxStorageGB: 5.0,
      maxBranches: 2,
      hasB2bBilling: false,
      hasWhatsapp: false,
      hasExpenses: true,
      features: growthFeatures,
    },
  });

  await prisma.plan.upsert({
    where: { name: 'GROWTH_YEARLY' },
    update: {},
    create: {
      name: 'GROWTH_YEARLY',
      displayName: 'Patholab Cloud - Growth (Yearly)',
      description: 'The engine for scaling labs. Build trust with custom reporting.',
      price: 3830,
      billingCycle: BillingCycle.YEARLY,
      isPopular: true,
      maxTestsPerMonth: 5000,
      maxPatientsTotal: 25000,
      maxStaff: 8,
      maxStorageGB: 5.0,
      maxBranches: 2,
      hasB2bBilling: false,
      hasWhatsapp: false,
      hasExpenses: true,
      features: growthFeatures,
    },
  });

  // ==========================================
  // 3. PREMIUM PLAN (Tier 3 - Enterprise)
  // ==========================================
  const premiumFeatures = JSON.stringify([
    "Up to 3 Branch Locations",
    "Everything in Growth",
    "Doctor & Agency Referral Management",
    "Automated WhatsApp Delivery",
    "Up to 15,000 tests/month"
  ]);

  await prisma.plan.upsert({
    where: { name: 'PREMIUM_MONTHLY' },
    update: {},
    create: {
      name: 'PREMIUM_MONTHLY',
      displayName: 'Patholab Cloud - Premium (Monthly)',
      description: 'Enterprise power. Automate B2B referrals and report delivery logistics.',
      price: 499,
      billingCycle: BillingCycle.MONTHLY,
      maxTestsPerMonth: 15000,
      maxPatientsTotal: 100000,
      maxStaff: 20,
      maxStorageGB: 15.0,
      maxBranches: 3,
      hasB2bBilling: true,  // Unlocks B2B Module
      hasWhatsapp: true,    // Unlocks Auto-WhatsApp
      hasExpenses: true,
      features: premiumFeatures,
    },
  });

  await prisma.plan.upsert({
    where: { name: 'PREMIUM_YEARLY' },
    update: {},
    create: {
      name: 'PREMIUM_YEARLY',
      displayName: 'Patholab Cloud - Premium (Yearly)',
      description: 'Enterprise power. Automate B2B referrals and report delivery logistics.',
      price: 4790,
      billingCycle: BillingCycle.YEARLY,
      maxTestsPerMonth: 15000,
      maxPatientsTotal: 100000,
      maxStaff: 20,
      maxStorageGB: 15.0,
      maxBranches: 3,
      hasB2bBilling: true,  // Unlocks B2B Module
      hasWhatsapp: true,    // Unlocks Auto-WhatsApp
      hasExpenses: true,
      features: premiumFeatures,
    },
  });

  console.log('✅ Seeding completed successfully. All WooCommerce SKUs are mapped!');
}

main()
  .catch((e) => {
    console.error('❌ Error during seeding:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });