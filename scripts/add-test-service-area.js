// Add a test service area for Test Lab so we can verify the full booking flow
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const lab = await prisma.lab.findUnique({ where: { portalSlug: 'testlab' } });
  if (!lab) { console.log('No testlab'); return; }

  // Find or create a main branch
  let branch = await prisma.branch.findFirst({ where: { labId: lab.id, isMainBranch: true } });
  if (!branch) {
    branch = await prisma.branch.create({
      data: {
        labId: lab.id,
        name: 'Main Branch',
        isMainBranch: true,
        address: '123 Main St',
        city: 'Mumbai',
        state: 'MH',
        pincode: '400001',
        phone: '9876543211',
      },
    });
    console.log('Created main branch:', branch.id);
  }

  // Add a service area for pincode 700001
  const existing = await prisma.serviceArea.findFirst({ where: { labId: lab.id, branchId: branch.id, pincode: '700001' } });
  if (existing) {
    console.log('Service area already exists:', existing.id);
  } else {
    const sa = await prisma.serviceArea.create({
      data: {
        labId: lab.id,
        branchId: branch.id,
        pincode: '700001',
        areaName: 'Park Street',
        deliveryFee: 50,
        isActive: true,
      },
    });
    console.log('✅ Created service area:', sa.id, '- pincode 700001');
  }

  // Also set a UPI ID on the lab so we can test the payment section
  if (!lab.upiId) {
    await prisma.lab.update({
      where: { id: lab.id },
      data: { upiId: 'testlab@okhdfcbank' },
    });
    console.log('✅ Set UPI ID: testlab@okhdfcbank');
  } else {
    console.log('Lab already has UPI ID:', lab.upiId);
  }
}

main().catch(console.error).finally(() => prisma.$disconnect());
