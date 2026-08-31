const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
async function main() {
  const labs = await prisma.lab.findMany({ select: { id: true, name: true, portalSlug: true, isActive: true, logo: true } });
  console.log('Labs:', JSON.stringify(labs, null, 2));
  const appts = await prisma.appointment.findMany({ take: 3, select: { id: true, trackId: true, status: true, labId: true } });
  console.log('Appointments:', JSON.stringify(appts, null, 2));
  const reports = await prisma.report.findMany({ take: 3, select: { id: true, status: true, version: true, labId: true } });
  console.log('Reports:', JSON.stringify(reports, null, 2));
}
main().catch(console.error).finally(() => prisma.$disconnect());
