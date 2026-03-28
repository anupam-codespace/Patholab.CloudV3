import { PrismaClient, BillingCycle } from '@prisma/client';

const prisma = new PrismaClient();

const plans = [
  // --- FREE TRIAL / VERIFICATION PLAN ---
  {
    id: "cmk_free_trial_verify_001",
    name: "free_trial",
    displayName: "7-Day Trial",
    description: "Full access verification plan. ₹1 charged for verification.",
    price: 1,
    currency: "INR",
    billingCycle: "MONTHLY" as BillingCycle, // DB says Monthly, but Razorpay handles the 7-day cycle
    maxTests: 50,
    maxStaff: 1,
    maxPatients: 10,
    maxStorageGB: 1,
    features: [
      "Full System Access",
      "Valid for 7 Days",
      "Instant Activation",
      "₹1 Verification Fee",
      "Cancel Anytime"
    ],
    isActive: true,
    isPopular: false,
    hasAnalytics: true,
    hasApiAccess: true,
    hasWhiteLabel: false,
    // UPDATED: Free Trial (₹ 1.00)
    razorpayId: "plan_S9IJhxhpMQxPkf",
    createdAt: new Date(),
    updatedAt: new Date()
  },

  // --- MONTHLY PLANS ---
  {
    id: "cmk0u3pc0000840z4041x06ak",
    name: "silver",
    displayName: "Starter Lab",
    description: "Best for: Small / Newly started pathology labs",
    price: 1499,
    currency: "INR",
    billingCycle: "MONTHLY" as BillingCycle,
    maxTests: 1000,
    maxStaff: 2,
    maxPatients: 100,
    maxStorageGB: 50,
    features: [
      "Up to 300 reports / month",
      "Patient registration & billing",
      "Basic test master",
      "PDF report generation",
      "Email report sharing",
      "Basic dashboard",
      "Single branch",
      "Single user access"
    ],
    isActive: true,
    isPopular: false,
    hasAnalytics: false,
    hasApiAccess: false,
    hasWhiteLabel: false,
    // UPDATED: Starter Lab Monthly (₹ 1,499.00)
    razorpayId: "plan_S9IEnY8MGKt5qB",
    createdAt: new Date("2026-01-05T07:23:38.112Z"),
    updatedAt: new Date("2026-01-24T08:35:16.790Z")
  },
  {
    id: "cmk10wpxr0000nrte1xkbadru",
    name: "gold",
    displayName: "Growth Lab",
    description: "Best for: Growing labs with steady daily volume",
    price: 2999,
    currency: "INR",
    billingCycle: "MONTHLY" as BillingCycle,
    maxTests: 100,
    maxStaff: 5,
    maxPatients: 100,
    maxStorageGB: 5,
    features: [
      "Up to 1,200 reports / month",
      "Up to 3 users",
      "Lab logo & header on reports",
      "Test packages & profiles",
      "Barcode sample handling",
      "TAT tracking",
      "Monthly analytics dashboard"
    ],
    isActive: true,
    isPopular: true,
    hasAnalytics: false,
    hasApiAccess: false,
    hasWhiteLabel: false,
    // UPDATED: Growth Lab Monthly (₹ 2,999.00)
    razorpayId: "plan_S9IFIItUD6L1M3",
    createdAt: new Date("2026-01-05T10:34:08.896Z"),
    updatedAt: new Date("2026-01-24T08:28:17.549Z")
  },
  {
    id: "cmks1ap3e000811bvmtwd9l2w",
    name: "diamond",
    displayName: "Professional Lab",
    description: "Best for: High-volume labs & diagnostic centers",
    price: 5999,
    currency: "INR",
    billingCycle: "MONTHLY" as BillingCycle,
    maxTests: 100,
    maxStaff: 5,
    maxPatients: 100,
    maxStorageGB: 5,
    features: [
      "Up to 2,500 reports / month",
      "Unlimited users",
      "Multi-branch (up to 3)",
      "Advanced analytics & exports",
      "Doctor-wise & test-wise revenue reports",
      "Excel / PDF report exports",
      "Role-based access control",
      "Priority support"
    ],
    isActive: true,
    isPopular: false,
    hasAnalytics: false,
    hasApiAccess: false,
    hasWhiteLabel: false,
    // UPDATED: Professional Lab Monthly (₹ 5,999.00)
    razorpayId: "plan_S9IFmBFbJBYdlK",
    createdAt: new Date("2026-01-24T08:14:48.098Z"),
    updatedAt: new Date("2026-01-24T12:01:43.988Z")
  },

  // --- YEARLY PLANS ---
  {
    id: "cmks1x3990000mynq6mloyqew",
    name: "silver1yr",
    displayName: "Starter Lab",
    description: "Best for: Small / newly started pathology labs",
    price: 17090,
    currency: "INR",
    billingCycle: "YEARLY" as BillingCycle,
    maxTests: 100,
    maxStaff: 5,
    maxPatients: 100,
    maxStorageGB: 5,
    features: [
      "Annual Savings: 5%",
      "Monthly total (12 months): ₹17,988",
      "Annual Price: ₹17,090",
      "You Save: ₹898"
    ],
    isActive: true,
    isPopular: false,
    hasAnalytics: false,
    hasApiAccess: false,
    hasWhiteLabel: false,
    // UPDATED: Starter Lab Yearly (₹ 17,090.00)
    razorpayId: "plan_S9IHFeJrA9LRta",
    createdAt: new Date("2026-01-24T08:32:13.244Z"),
    updatedAt: new Date("2026-01-24T08:32:13.244Z")
  },
  {
    id: "cmks1z4fe0001mynq89t1u4l1",
    name: "gold1yr",
    displayName: "Growth Lab",
    description: "Best for: Growing labs with steady daily volume",
    price: 32390,
    currency: "INR",
    billingCycle: "YEARLY" as BillingCycle,
    maxTests: 100,
    maxStaff: 10,
    maxPatients: 100,
    maxStorageGB: 5,
    features: [
      "Annual Savings: 10%",
      "Monthly total (12 months): ₹35,988",
      "Annual Price: ₹32,390",
      "You Save: ₹3,598"
    ],
    isActive: true,
    isPopular: true,
    hasAnalytics: false,
    hasApiAccess: false,
    hasWhiteLabel: false,
    // UPDATED: Growth Lab Yearly (₹ 32,390.00)
    razorpayId: "plan_S9IGnB0b4ZH57o",
    createdAt: new Date("2026-01-24T08:33:47.573Z"),
    updatedAt: new Date("2026-01-24T08:35:53.186Z")
  },
  {
    id: "cmks23jfi0002mynqu4d89d8j",
    name: "diamond1yr",
    displayName: "Professional Lab",
    description: "Best for: High-volume labs & diagnostic centers",
    price: 59750,
    currency: "INR",
    billingCycle: "YEARLY" as BillingCycle,
    maxTests: 100,
    maxStaff: 20,
    maxPatients: 100,
    maxStorageGB: 5,
    features: [
      "Annual Savings: 17%",
      "Monthly total (12 months): ₹71,988",
      "Annual Price: ₹59,750",
      "You Save: ₹12,238"
    ],
    isActive: true,
    isPopular: false,
    hasAnalytics: false,
    hasApiAccess: false,
    hasWhiteLabel: false,
    // UPDATED: Professional Lab Yearly (₹ 59,750.00)
    razorpayId: "plan_S9IGK0f4c0h92q",
    createdAt: new Date("2026-01-24T08:37:13.806Z"),
    updatedAt: new Date("2026-01-24T08:41:58.270Z")
  }
];

async function main() {
  console.log(`Start seeding plans...`);

  for (const plan of plans) {
    const result = await prisma.plan.upsert({
      where: { id: plan.id },
      update: plan,
      create: plan,
    });
    console.log(`Upserted plan: ${result.displayName} (${result.billingCycle}) -> Razorpay: ${result.razorpayId}`);
  }

  console.log(`Seeding finished.`);
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });