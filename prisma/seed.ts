import { PrismaClient, Role, TransactionType } from '@prisma/client';
import * as bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting database seeding...');

  // 1. Create System Configuration
  console.log('⚙️  Configuring System Defaults...');
  const systemConfig = await prisma.systemConfig.findFirst();
  if (!systemConfig) {
    await prisma.systemConfig.create({
      data: {
        systemName: 'Patholab Cloud Enterprise',
        currency: 'INR',
        currencySymbol: '₹',
        taxRate: 18.0,
        enablePatientPortal: true,
        invoicePrefix: 'SAAS',
        nextInvoiceNo: 1,
      },
    });
  }

  // 2. Create Super Admin
  console.log('👑 Provisioning Super Admin...');
  const adminPassword = await bcrypt.hash('Admin@123', 10);
  const admin = await prisma.user.upsert({
    where: { email: 'admin@patholab.cloud' },
    update: {},
    create: {
      email: 'admin@patholab.cloud',
      password: adminPassword,
      name: 'System Administrator',
      phone: '9999999999',
      role: Role.SUPER_ADMIN,
      isActive: true,
      emailVerified: true,
      onboardingStatus: 'COMPLETED',
    },
  });

  // 3. Create Demo Lab Owner
  console.log('👨‍🔬 Provisioning Demo Lab Owner...');
  const ownerPassword = await bcrypt.hash('Owner@123', 10);
  const owner = await prisma.user.upsert({
    where: { email: 'owner@demolab.com' },
    update: {},
    create: {
      email: 'owner@demolab.com',
      password: ownerPassword,
      name: 'Dr. John Doe',
      phone: '8888888888',
      role: Role.LAB_OWNER,
      isActive: true,
      emailVerified: true,
      onboardingStatus: 'COMPLETED',
    },
  });

  // 4. Create Lab & Main Branch
  console.log('🏥 Setting up Lab & Branch Infrastructure...');
  const lab = await prisma.lab.upsert({
    where: { ownerId: owner.id },
    update: {},
    create: {
      name: 'Apex Diagnostics',
      portalSlug: 'apex-diagnostics',
      labCode: 'APEX001',
      address: '123 Health Avenue',
      city: 'Mumbai',
      state: 'Maharashtra',
      pincode: '400001',
      phone: '8888888888',
      email: 'contact@demolab.com',
      licenseNumber: 'LIC-APEX-2024',
      ownerId: owner.id,
      isActive: true,
      branches: {
        create: {
          name: 'Apex Main Center',
          branchCode: 'APEX-HQ',
          isMainBranch: true,
          address: '123 Health Avenue',
          city: 'Mumbai',
          state: 'Maharashtra',
          pincode: '400001',
          phone: '8888888888',
        },
      },
    },
  });

  // 5. Initialize the Pay-As-You-Go Wallet
  console.log('💳 Activating Pay-As-You-Go Wallet...');
  const wallet = await prisma.labWallet.findUnique({
    where: { labId: lab.id },
  });

  if (!wallet) {
    const oneYearFromNow = new Date();
    oneYearFromNow.setFullYear(oneYearFromNow.getFullYear() + 1);

    await prisma.labWallet.create({
      data: {
        labId: lab.id,
        balance: 5000.0, // Give them ₹5000 opening balance
        validityEndDate: oneYearFromNow,
        isActive: true,
        isLisIntegrationPaid: true, // Unlock premium LIS features for demo
        transactions: {
          create: {
            type: TransactionType.RECHARGE,
            amount: 5000.0,
            closingBalance: 5000.0,
            description: 'Initial Platform Onboarding Grant',
          },
        },
      },
    });
  }

  // 6. Global Dictionary: Departments
  console.log('📚 Seeding Clinical Dictionary (Departments, Containers)...');
  const departments = ['Hematology', 'Biochemistry', 'Microbiology', 'Pathology', 'Immunology'];
  for (const dept of departments) {
    await prisma.department.upsert({
      where: { labId_name: { labId: lab.id, name: dept } },
      update: {},
      create: { name: dept, isGlobal: true, labId: lab.id },
    });
  }

  // 7. Global Dictionary: Sample Types
  const sampleTypes = ['Whole Blood', 'Serum', 'Plasma', 'Urine', 'Stool'];
  for (const sample of sampleTypes) {
    await prisma.sampleType.upsert({
      where: { labId_name: { labId: lab.id, name: sample } },
      update: {},
      create: { name: sample, isGlobal: true, labId: lab.id },
    });
  }

  // 8. Global Dictionary: Container Types
  const containers = [
    { name: 'EDTA Vacutainer', code: 'EDTA', capColor: '#800080' }, // Purple
    { name: 'SST Gel Tube', code: 'SST', capColor: '#FFFF00' }, // Yellow
    { name: 'Sodium Fluoride', code: 'FLUORIDE', capColor: '#808080' }, // Grey
    { name: 'Plain Clot Activator', code: 'PLAIN', capColor: '#FF0000' }, // Red
  ];
  for (const container of containers) {
    await prisma.containerType.upsert({
      where: { labId_name: { labId: lab.id, name: container.name } },
      update: {},
      create: {
        name: container.name,
        code: container.code,
        capColor: container.capColor,
        isGlobal: true,
        labId: lab.id,
      },
    });
  }

  console.log('✅ Seeding completed successfully!');
  console.log('--------------------------------------------------');
  console.log('Login Credentials for testing:');
  console.log('Admin: admin@patholab.cloud / Admin@123');
  console.log('Owner: owner@demolab.com / Owner@123');
  console.log('--------------------------------------------------');
}

main()
  .catch((e) => {
    console.error('❌ Error during seeding:');
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });