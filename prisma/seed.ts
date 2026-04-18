const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting database seed...');

  // Common password for all seeded users: 'password123'
  const hashedPassword = await bcrypt.hash('password123', 10);

  // ==========================================
  // 1. SUPER ADMIN
  // ==========================================
  const superAdmin = await prisma.user.upsert({
    where: { email: 'admin@patholab.cloud' },
    update: {},
    create: {
      email: 'admin@patholab.cloud',
      password: hashedPassword,
      name: 'System Administrator',
      phone: '9999999999',
      role: 'SUPER_ADMIN',
      isActive: true,
      emailVerified: true,
      onboardingStatus: 'COMPLETED',
    },
  });
  console.log(`✅ Created Super Admin: ${superAdmin.email}`);

  // ==========================================
  // 2. LAB OWNER
  // ==========================================
  const labOwner = await prisma.user.upsert({
    where: { email: 'owner@globiz.com' },
    update: {},
    create: {
      email: 'owner@globiz.com',
      password: hashedPassword,
      name: 'Monowar Hussain',
      phone: '8888888888',
      role: 'LAB_OWNER',
      isActive: true,
      emailVerified: true,
      onboardingStatus: 'COMPLETED',
    },
  });
  console.log(`✅ Created Lab Owner: ${labOwner.email}`);

  // ==========================================
  // 3. CREATE THE LABORATORY
  // ==========================================
  const lab = await prisma.lab.upsert({
    where: { ownerId: labOwner.id },
    update: {},
    create: {
      ownerId: labOwner.id,
      name: 'Globiz Patholab',
      address: '123 Medical District, Health Avenue',
      city: 'Bongaigaon',
      state: 'Assam',
      pincode: '783380',
      phone: '1800-123-4567',
      email: 'contact@globizpatholab.com',
      licenseNumber: 'GLOBIZ-LIC-2026',
      isActive: true,
      defaultDoctorCommission: 15.0,
      defaultAgencyCommission: 10.0,
      commissionType: 'PERCENTAGE',
    },
  });
  console.log(`✅ Created Lab: ${lab.name}`);

  // Create a Main Branch for the Lab
  const mainBranch = await prisma.branch.create({
    data: {
      labId: lab.id,
      name: 'Headquarters',
      code: 'HQ-01',
      isMainBranch: true,
      address: lab.address,
      city: lab.city,
      state: lab.state,
      pincode: lab.pincode,
      phone: lab.phone,
      isActive: true,
    },
  });
  console.log(`✅ Created Main Branch: ${mainBranch.name}`);

  // ==========================================
  // 4. LAB STAFF (Manager, Tech, Receptionist)
  // ==========================================
  const manager = await prisma.user.upsert({
    where: { email: 'manager@globiz.com' },
    update: {},
    create: {
      email: 'manager@globiz.com',
      password: hashedPassword,
      name: 'Sarah Manager',
      role: 'LAB_MANAGER',
      isActive: true,
      emailVerified: true,
      onboardingStatus: 'COMPLETED',
      staffLabs: {
        create: {
          labId: lab.id,
          branchId: mainBranch.id,
          position: 'Operations Manager',
          salary: 50000.00,
        },
      },
    },
  });
  console.log(`✅ Created Lab Manager: ${manager.email}`);

  const technician = await prisma.user.upsert({
    where: { email: 'tech@globiz.com' },
    update: {},
    create: {
      email: 'tech@globiz.com',
      password: hashedPassword,
      name: 'Dr. John Technician',
      role: 'TECHNICIAN',
      isActive: true,
      emailVerified: true,
      onboardingStatus: 'COMPLETED',
      staffLabs: {
        create: {
          labId: lab.id,
          branchId: mainBranch.id,
          position: 'Senior Phlebotomist',
          salary: 35000.00,
        },
      },
    },
  });
  console.log(`✅ Created Technician: ${technician.email}`);

  const receptionist = await prisma.user.upsert({
    where: { email: 'desk@globiz.com' },
    update: {},
    create: {
      email: 'desk@globiz.com',
      password: hashedPassword,
      name: 'Alice Reception',
      role: 'RECEPTIONIST',
      isActive: true,
      emailVerified: true,
      onboardingStatus: 'COMPLETED',
      staffLabs: {
        create: {
          labId: lab.id,
          branchId: mainBranch.id,
          position: 'Front Desk',
          salary: 25000.00,
        },
      },
    },
  });
  console.log(`✅ Created Receptionist: ${receptionist.email}`);

  // ==========================================
  // 5. REFERRALS (Doctor & Agency)
  // ==========================================
  const doctorUser = await prisma.user.upsert({
    where: { email: 'dr.smith@clinic.com' },
    update: {},
    create: {
      email: 'dr.smith@clinic.com',
      password: hashedPassword,
      name: 'Dr. Sarah Smith',
      role: 'DOCTOR',
      isActive: true,
      emailVerified: true,
      onboardingStatus: 'COMPLETED',
      doctor: {
        create: {
          labId: lab.id,
          name: 'Dr. Sarah Smith',
          specialization: 'General Physician',
          clinic: 'Smith Care Clinic',
          commissionRate: 15.0,
        },
      },
    },
  });
  console.log(`✅ Created Referral Doctor: ${doctorUser.email}`);

  const agencyUser = await prisma.user.upsert({
    where: { email: 'b2b@faridatannery.com' },
    update: {},
    create: {
      email: 'b2b@faridatannery.com',
      password: hashedPassword,
      name: 'Farida Tannery Admin',
      role: 'AGENCY',
      isActive: true,
      emailVerified: true,
      onboardingStatus: 'COMPLETED',
      agency: {
        create: {
          labId: lab.id,
          agencyName: 'Farida Prime Tannery',
          contactPerson: 'Mr. Ettiyappan',
          commissionRate: 10.0,
        },
      },
    },
  });
  console.log(`✅ Created Agency Client: ${agencyUser.email}`);

  // ==========================================
  // 6. SUBSCRIPTION PLANS
  // ==========================================
  console.log('📦 Creating Subscription Plans...');

  const basicPlan = await prisma.plan.upsert({
    where: { name: 'basic-monthly' },
    update: {},
    create: {
      name: 'basic-monthly',
      displayName: 'Starter Lab',
      description: 'Perfect for small, single-location pathology labs.',
      price: 999.00,
      currency: 'INR',
      billingCycle: 'MONTHLY',
      maxTestsPerMonth: 1000,
      maxPatientsTotal: 5000,
      maxStaff: 3,
      maxBranches: 1,
      maxStorageGB: 5.0,
      hasEmailReports: true,
      hasExpenses: true,
      hasInventory: false,
      hasB2bBilling: false,
      hasWhatsapp: false,
      hasMachineIoT: false,
      hasAiPrediction: false,
      hasRadiology: false,
      isActive: true,
      isPopular: false,
      features: JSON.stringify(["Up to 1,000 Tests/month", "3 Staff Accounts", "Standard Reporting", "Expense Tracking"])
    },
  });
  console.log(`✅ Created Plan: ${basicPlan.displayName}`);

  const proPlan = await prisma.plan.upsert({
    where: { name: 'pro-monthly' },
    update: {},
    create: {
      name: 'pro-monthly',
      displayName: 'Growth Pro',
      description: 'Advanced features for growing labs with B2B clients.',
      price: 2999.00,
      currency: 'INR',
      billingCycle: 'MONTHLY',
      maxTestsPerMonth: 5000,
      maxPatientsTotal: 25000,
      maxStaff: 10,
      maxBranches: 3,
      maxStorageGB: 25.0,
      hasEmailReports: true,
      hasExpenses: true,
      hasInventory: true,
      hasB2bBilling: true,
      hasWhatsapp: true,
      hasMachineIoT: false,
      hasAiPrediction: false,
      hasRadiology: false,
      isActive: true,
      isPopular: true,
      features: JSON.stringify(["Up to 5,000 Tests/month", "10 Staff Accounts & 3 Branches", "WhatsApp Report Delivery", "B2B Agency Billing", "Inventory Management"])
    },
  });
  console.log(`✅ Created Plan: ${proPlan.displayName}`);

  const enterprisePlan = await prisma.plan.upsert({
    where: { name: 'enterprise-monthly' },
    update: {},
    create: {
      name: 'enterprise-monthly',
      displayName: 'Enterprise Scale',
      description: 'Full automation with Machine IoT, Radiology, and AI.',
      price: 7999.00,
      currency: 'INR',
      billingCycle: 'MONTHLY',
      maxTestsPerMonth: 50000,
      maxPatientsTotal: 200000,
      maxStaff: 50,
      maxBranches: 10,
      maxStorageGB: 100.0,
      hasEmailReports: true,
      hasExpenses: true,
      hasInventory: true,
      hasB2bBilling: true,
      hasWhatsapp: true,
      hasMachineIoT: true,
      hasAiPrediction: true,
      hasRadiology: true,
      hasApiAccess: true,
      hasWhiteLabel: true,
      isActive: true,
      isPopular: false,
      features: JSON.stringify(["Unlimited Tests (Fair Use)", "Up to 10 Branches", "Machine Interfacing (IoT)", "Radiology (RIS/PACS)", "AI Diagnostic Predictions"])
    },
  });
  console.log(`✅ Created Plan: ${enterprisePlan.displayName}`);

  // ==========================================
  // 7. ACTIVATE SUBSCRIPTION
  // ==========================================
  await prisma.subscription.upsert({
    where: { labId: lab.id },
    update: {},
    create: {
      labId: lab.id,
      planId: proPlan.id,
      status: 'ACTIVE',
      endDate: new Date(new Date().setFullYear(new Date().getFullYear() + 1)), // Valid for 1 year
    }
  });
  console.log(`✅ Subscribed ${lab.name} to ${proPlan.displayName} Plan`);

  console.log('🎉 Seeding completed successfully!');
}

main()
  .catch((e) => {
    console.error('❌ Error during seeding:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });